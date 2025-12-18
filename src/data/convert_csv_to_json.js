import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const csvFilePath = join(__dirname, 'turnos.csv');
const jsonFilePath = join(__dirname, 'turnos.json');

function convertCsvToJson() {
    try {
        const csvData = fs.readFileSync(csvFilePath, 'utf8');
        const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length === 0) {
            console.error('El archivo CSV está vacío.');
            return;
        }

        const headers = lines[0].split(';');
        const result = lines.slice(1).map(line => {
            const values = line.split(';');
            const entry = {};
            headers.forEach((header, index) => {
                let value = values[index] ? values[index].trim() : "";

                // Intentar convertir a número si es posible
                if (value !== "" && !isNaN(value)) {
                    value = Number(value);
                }

                entry[header.trim()] = value;
            });
            return entry;
        });

        fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2), 'utf8');
        console.log(`Conversión completada con éxito. Archivo guardado en: ${jsonFilePath}`);
        console.log(`Total de registros convertidos: ${result.length}`);
    } catch (error) {
        console.error('Error durante la conversión:', error.message);
    }
}

convertCsvToJson();
