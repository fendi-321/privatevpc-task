// Render aws-architecture-diagram.html to a PNG using Puppeteer (CommonJS)
const puppeteer = require("puppeteer");
const path = require("path");
const { pathToFileURL } = require("url");

const htmlPath = path.resolve("aws-architecture-diagram.html");
const outPath = path.resolve("aws-architecture-diagram.png");

(async () => {
  console.log("Loading HTML:", htmlPath);
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1100, height: 800, deviceScaleFactor: 2 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    const url = pathToFileURL(htmlPath).href;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

    // Wait for the React-rendered SVG to be present
    await page.waitForSelector("#diagram-container svg", { timeout: 30000 });

    // Screenshot just the diagram container
    const container = await page.$("#diagram-container");
    if (!container) throw new Error("Diagram container not found");
    await container.screenshot({
      path: outPath,
      type: "png",
      captureBeyondViewport: true,
      omitBackground: false,
    });

    console.log("Saved PNG:", outPath);
  } catch (err) {
    console.error("Failed to render PNG:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
