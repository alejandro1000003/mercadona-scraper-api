const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");
const { findAvailablePort } = require('./free-port.js')
const fs = require("fs");
const path = require("path");


const desiredPort = process.env.PORT ?? 3000
const app = express();

// Configuración de CORS
const corsOptions = {
    origin: ["http://localhost:5173"],
};

app.use(cors(corsOptions));

let scrapingResults = [];

// Definir categorías con nombres e imágenes
const categorias = [
    { "nombre": "aceites", "url": "https://tienda.mercadona.es/categories/112"},
    { "nombre": "aguas-y-refrescos", "url": "https://tienda.mercadona.es/categories/156"},
    { "nombre": "aperitivos", "url": "https://tienda.mercadona.es/categories/135"},
    { "nombre": "arroz-legumbres-y-pasta", "url": "https://tienda.mercadona.es/categories/118"},
    { "nombre": "azucar-caramelos-y-chocolate", "url": "https://tienda.mercadona.es/categories/89"},
    { "nombre": "bebe", "url": "https://tienda.mercadona.es/categories/216"},
    { "nombre": "bodega", "url": "https://tienda.mercadona.es/categories/164"}
];

// Realizar scraping al iniciar el servidor
const performScraping = async () => {
    try {
        // Iniciar navegador Chromium con Playwright
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // Navegar y establecer cookies
        await page.goto("https://tienda.mercadona.es");
        await page.context().addCookies([
            { name: "__mo_ui", value: '{"language":"es"}', domain: "tienda.mercadona.es", path: "/" },
            { name: "amplitude_id_79df67fe141fc3f96c86626c407a01c1tienda.mercadona.es", value: "eyJkZXZpY2VJZCI6IjM3YjhiZWRhLTU5MGMtNDg4Ni1iMGYzLWY3Yzc3ZDM3YmU1NlIiLCJ1c2VySWQiOm51bGwsIm9wdE91dCI6ZmFsc2UsInNlc3Npb25JZCI6MTcyMzgzMjczMTU0OCwibGFzdEV2ZW50VGltZSI6MTcyMzgzMjk2Mzg4NiwiZXZlbnRJZCI6MzksImlkZW50aWZ5SWQiOjYsInNlcXVlbmNlTnVtYmVyIjo0NX0=", domain: "tienda.mercadona.es", path: "/" },
            { name: "__mo_ca", value: '{"thirdParty":true,"necessary":true,"version":1}', domain: "tienda.mercadona.es", path: "/" },
            { name: "__mo_da", value: '{"warehouse":"bcn1","postalCode":"08002"}', domain: "tienda.mercadona.es", path: "/" }
        ]);

        // Iterar sobre las categorías y recolectar datos
        scrapingResults = [];
        for (const categoria of categorias) {
            console.log(`Nombre: ${categoria.nombre}, URL: ${categoria.url}`);

            await page.goto(categoria.url);
            await page.waitForSelector('[data-testid="product-cell"]');

            const productos = await page.$$('[data-testid="product-cell"]');
            console.log(`Número de productos en ${categoria.nombre}: ${productos.length}`);
            for (const producto of productos) {
                try {
                    const imagen = await producto.$eval('.product-cell__image-wrapper img', img => img.src);
                    const nombre = await producto.$eval('.product-cell__description-name', el => el.textContent.trim());
                    const precio = await producto.$eval('.product-price__unit-price', el => el.textContent.trim());
                    console.log({ nombre, imagen, precio, categoria: categoria.nombre });
                    scrapingResults.push({ nombre, imagen, precio, categoria: categoria.nombre });
                } catch (error) {
                    console.error(`Error extracting product data in category ${categoria.nombre}:`, error);
                }
            }
        }

        // Cerrar el navegador
        await browser.close();
        console.log("Navegador cerrado");

    } catch (error) {
        console.error("Error realizando el scraping", error);
    }
};

// Ejecutar scraping al iniciar el servidor
performScraping().then(() => {
    console.log("Scraping completed");
    // Endpoint para devolver frutas y resultados de scraping
    app.get("/api", (req, res) => {
        res.json({ 
            "scrapingResults": scrapingResults
        });
    });
    
    // Iniciar servidor
    findAvailablePort(desiredPort).then(port => {
        app.listen(port, () => {
            console.log(`server listening on port http://localhost:${port}`)
        })
    })

}).catch(error => {
    console.error("Error in performScraping:", error);
});


