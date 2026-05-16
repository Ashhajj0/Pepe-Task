import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS for all origins - especially important for embedded browsers like Telegram
  app.use(cors());

  // Server-side cache
  const priceCache = {
    data: null as any,
    timestamp: 0
  };
  const CACHE_TTL = 3000; // 3 seconds for near-realtime

  // Approximate fallback rates (1 USD to X) to use as absolute last resort
  const FALLBACK_RATES: Record<string, number> = {
    usd: 1,
    eur: 0.92,
    gbp: 0.79,
    inr: 83.3,
    bdt: 117.0,
    pkr: 278.5,
    idr: 16000,
    rub: 91.0
  };

  const POPULAR_VS = 'usd,eur,gbp,inr,bdt,pkr,idr,rub';

  // API Route to proxy Pepe price requests
  app.get("/api/pepe-price", async (req, res) => {
    // Prevent caching at all levels - MUST be before any response
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const now = Date.now();
    
    // Serve from cache if fresh (10s)
    if (priceCache.data && now - priceCache.timestamp < CACHE_TTL) {
      return res.json(priceCache.data);
    }

    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    };

    // Attempt 1: Binance (Reliable CEX)
    try {
      const binanceResponse = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=PEPEUSDT`, fetchOptions);
      if (binanceResponse.ok) {
        const binanceData = await binanceResponse.json();
        if (binanceData.price) {
          const baseUSD = parseFloat(binanceData.price);
          
          const sanitizedData: any = { 
            pepe: { 
              usd: baseUSD,
              usd_24h_change: 0 // Binance basic ticker doesn't easily give 24h change in one call without 24hr endpoint
            } 
          };

          Object.keys(FALLBACK_RATES).forEach(curr => {
            if (curr !== 'usd') {
              sanitizedData.pepe[curr.toLowerCase()] = baseUSD * FALLBACK_RATES[curr];
            }
          });

          priceCache.data = sanitizedData;
          priceCache.timestamp = now;
          return res.json(sanitizedData);
        }
      }
    } catch (e) {
      console.warn("Binance API failed", e);
    }

    // Attempt 2: DexScreener (Realtime On-Chain)
    try {
      // Add random query to prevent AnyCast or upstream node caching
      const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/0x6982508145454ce325ddbe47a25d4ec3d2311933?nocache=${now}`, fetchOptions);
      if (dexResponse.ok) {
        const dexData = await dexResponse.json();
        const pair = dexData.pairs?.[0]; 
        if (pair && pair.priceUsd) {
          const baseUSD = parseFloat(pair.priceUsd);
          const change24h = parseFloat(pair.priceChange?.h24 || "0");
          
          const sanitizedData: any = { 
            pepe: { 
              usd: baseUSD,
              usd_24h_change: change24h
            } 
          };

          Object.keys(FALLBACK_RATES).forEach(curr => {
            if (curr !== 'usd') {
              sanitizedData.pepe[curr.toLowerCase()] = baseUSD * FALLBACK_RATES[curr];
            }
          });

          priceCache.data = sanitizedData;
          priceCache.timestamp = now;
          return res.json(sanitizedData);
        }
      }
    } catch (e) {
      console.warn("Indexers slow, trying aggregators...", e);
    }

    // Attempt 2: CoinGecko (Backup)
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=pepe&vs_currencies=${POPULAR_VS}&include_24hr_change=true`);
      
      if (response.status === 429) {
        console.warn("CoinGecko 429 - Rate limited. Using cache/fallback.");
        if (priceCache.data) return res.json(priceCache.data);
        return res.json(getStaticFallback());
      }

      if (!response.ok) throw new Error(`CoinGecko status: ${response.status}`);

      const data = await response.json();
      
      // Ensure the structure is correct even if some currencies are missing from CG response
      if (data.pepe) {
        const sanitizedData: any = { pepe: { ...data.pepe } };
        // CoinGecko might return keys as 'usd' but sometimes it varies. Normalize to lowercase.
        const pepeData = data.pepe;
        const baseUSD = pepeData.usd || 0.000008;
        
        // Fill in any missing vs_currencies using fallback rates relative to USD price
        Object.keys(FALLBACK_RATES).forEach(curr => {
          const lCurr = curr.toLowerCase();
          if (pepeData[lCurr] === undefined && pepeData[curr] === undefined) {
             sanitizedData.pepe[lCurr] = baseUSD * FALLBACK_RATES[curr];
          } else {
             // Ensure it's in lowercase for the client
             sanitizedData.pepe[lCurr] = pepeData[lCurr] || pepeData[curr];
          }
        });

        priceCache.data = sanitizedData;
        priceCache.timestamp = now;
        return res.json(sanitizedData);
      }
      
      throw new Error("Invalid format from CoinGecko");
    } catch (error) {
      console.error("Server-side price fetch error:", error);
      if (priceCache.data) return res.json(priceCache.data);
      return res.json(getStaticFallback());
    }
  });

  function getStaticFallback() {
    // Updated fallback to user requested value
    const basePrice = 0.000004;
    const fallbackObj: any = { pepe: { usd: basePrice, usd_24h_change: 0 } };
    Object.keys(FALLBACK_RATES).forEach(curr => {
      fallbackObj.pepe[curr] = basePrice * FALLBACK_RATES[curr];
    });
    return fallbackObj;
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
