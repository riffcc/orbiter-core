import { Orbiter } from "../dist/index.js";
import { créerConstellation } from "constl-ipa-fork";

const MAX_LENSES = 50;
const TARGET_SYNC_TIME_MS = 3000;
const STEP_SIZE = 5;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createLens(id) {
  console.log(`Creating lens ${id}...`);
  
  const constellation = créerConstellation({
    protocoles: ["/riffcc/1.0.0"],
    filtreTransport: (transport) => {
      if (transport.remoteAddr && 
          (transport.remoteAddr.includes('127.0.0.1') || 
           transport.remoteAddr.includes('localhost')) && 
          !transport.remoteAddr.includes('/p2p-circuit/')) {
        return false;
      }
      return true;
    }
  });
  
  await new Promise(resolve => {
    const checkInit = () => {
      if (constellation.prêt) {
        resolve();
      } else {
        setTimeout(checkInit, 100);
      }
    };
    checkInit();
  });
  
  const lens = await Orbiter.createOrbiter({
    constellation
  });
  
  console.log(`Created lens ${id} with site ID: ${lens.siteId}`);
  
  try {
    await lens.addRelease({
      contentName: `Test Release ${id}`,
      file: `QmTest${id}`,
      thumbnail: `QmThumb${id}`,
      author: `Author ${id}`,
      metadata: { description: `Test release ${id}` }
    });
    console.log(`Added test release to lens ${id}`);
  } catch (error) {
    console.error(`Error adding release to lens ${id}:`, error);
  }
  
  return lens;
}

async function benchmarkSync(numLenses) {
  console.log(`\n=== BENCHMARK: ${numLenses} LENSES ===`);
  
  const lenses = [];
  for (let i = 0; i < numLenses; i++) {
    try {
      const lens = await createLens(i);
      lenses.push(lens);
    } catch (error) {
      console.error(`Error creating lens ${i}:`, error);
    }
  }
  
  console.log(`Created ${lenses.length} lenses`);
  
  await sleep(1000);
  
  console.log("Setting up trust relationships...");
  for (let i = 0; i < lenses.length; i++) {
    for (let j = 0; j < lenses.length; j++) {
      if (i !== j) {
        try {
          await lenses[i].trustSite({
            siteId: `benchmark-lens-${j}`,
            name: `Benchmark Lens ${j}`
          });
        } catch (error) {
          console.error(`Error trusting lens ${j} from lens ${i}:`, error);
        }
      }
    }
  }
  
  console.log("Starting sync benchmark...");
  
  const testLens = lenses[0];
  
  let syncComplete = false;
  let syncStartTime = 0;
  let syncEndTime = 0;
  let partialSyncTime = 0;
  let firstContentTime = 0;
  
  testLens.events.on("syncProgress", (progress) => {
    if (progress.type === "releases" && progress.loaded > 0 && firstContentTime === 0) {
      firstContentTime = Date.now();
      partialSyncTime = firstContentTime - syncStartTime;
      console.log(`First content available after ${partialSyncTime}ms`);
    }
  });
  
  testLens.events.on("syncComplete", (type) => {
    if (type === "releases" && !syncComplete) {
      syncComplete = true;
      syncEndTime = Date.now();
      const totalSyncTime = syncEndTime - syncStartTime;
      console.log(`Complete sync finished after ${totalSyncTime}ms`);
    }
  });
  
  syncStartTime = Date.now();
  
  testLens.listenForReleases({
    f: (releases) => {
      if (releases && releases.length > 0 && firstContentTime === 0) {
        firstContentTime = Date.now();
        partialSyncTime = firstContentTime - syncStartTime;
        console.log(`First content received after ${partialSyncTime}ms`);
      }
    }
  });
  
  const timeout = 60000;
  const startWait = Date.now();
  
  while (!syncComplete && (Date.now() - startWait < timeout)) {
    await sleep(100);
  }
  
  if (!syncComplete) {
    console.log(`Sync timed out after ${timeout}ms`);
    syncEndTime = Date.now();
  }
  
  const results = {
    numLenses,
    firstContentTime: partialSyncTime || null,
    totalSyncTime: syncEndTime - syncStartTime
  };
  
  for (const lens of lenses) {
    try {
      await lens.constellation.fermer();
    } catch (error) {
      console.error("Error closing constellation:", error);
    }
  }
  
  return results;
}

async function findMaxLensesSupported() {
  console.log(`\n=== FINDING MAX LENSES WITH SYNC TIME UNDER ${TARGET_SYNC_TIME_MS}ms ===\n`);
  
  const results = [];
  let numLenses = STEP_SIZE;
  let maxLenses = 0;
  
  while (numLenses <= MAX_LENSES) {
    try {
      const result = await benchmarkSync(numLenses);
      results.push(result);
      
      console.log(`\nResults for ${numLenses} lenses:`);
      console.log(`- First content available: ${result.firstContentTime}ms`);
      console.log(`- Total sync time: ${result.totalSyncTime}ms`);
      
      if (result.totalSyncTime <= TARGET_SYNC_TIME_MS) {
        maxLenses = numLenses;
        numLenses += STEP_SIZE;
      } else {
        break;
      }
    } catch (error) {
      console.error(`Error benchmarking ${numLenses} lenses:`, error);
      break;
    }
  }
  
  console.log(`\n=== BENCHMARK SUMMARY ===`);
  console.log(`Maximum lenses supported with sync time under ${TARGET_SYNC_TIME_MS}ms: ~${maxLenses}`);
  console.log(`\nDetailed results:`);
  results.forEach(r => {
    console.log(`${r.numLenses} lenses: ${r.firstContentTime}ms to first content, ${r.totalSyncTime}ms total sync time`);
  });
}

findMaxLensesSupported().catch(console.error);
