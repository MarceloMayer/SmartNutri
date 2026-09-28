import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import { createPool, type ResultSetHeader } from 'mysql2/promise';
import * as XLSX from 'xlsx';

import { env } from '../../config/env';

type CellValue = string | number | boolean | Date | null | undefined;
type SheetRow = CellValue[];

type NutrientKey =
  | 'kcalPer100g'
  | 'carbsPer100g'
  | 'proteinPer100g'
  | 'fatPer100g'
  | 'fiberPer100g';

interface CliArgs {
  filePath: string | null;
  sheetName: string | null;
}

interface ColumnMapping {
  headerRowIndex: number;
  columns: {
    name: number;
    tacoCode: number | null;
    kcalPer100g: number | null;
    carbsPer100g: number | null;
    proteinPer100g: number | null;
    fatPer100g: number | null;
    fiberPer100g: number | null;
  };
}

interface TacoFood {
  name: string;
  slug: string;
  tacoCode: string | null;
  kcalPer100g: number | null;
  carbsPer100g: number | null;
  proteinPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
}

const nutrientKeys: NutrientKey[] = [
  'kcalPer100g',
  'carbsPer100g',
  'proteinPer100g',
  'fatPer100g',
  'fiberPer100g'
];

const headerPatterns: Record<keyof ColumnMapping['columns'], RegExp[]> = {
  name: [
    /descricao.*alimento/,
    /nome.*alimento/,
    /^alimento$/
  ],
  tacoCode: [
    /codigo.*taco/,
    /cod.*taco/,
    /numero.*alimento/,
    /^codigo$/,
    /^cod$/,
    /^n$/
  ],
  kcalPer100g: [
    /energia.*kcal/,
    /^kcal$/,
    /caloria/
  ],
  carbsPer100g: [
    /carbo\s*idrato/,
    /^carb/
  ],
  proteinPer100g: [
    /proteina/
  ],
  fatPer100g: [
    /lipidio/,
    /lipideo/,
    /gordura/,
    /^fat$/
  ],
  fiberPer100g: [
    /fibra/
  ]
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    filePath: null,
    sheetName: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextArg = argv[index + 1];

    if ((arg === '--file' || arg === '-f') && nextArg) {
      args.filePath = nextArg;
      index += 1;
      continue;
    }

    if ((arg === '--sheet' || arg === '-s') && nextArg) {
      args.sheetName = nextArg;
      index += 1;
      continue;
    }

    if (!arg.startsWith('-') && !args.filePath) {
      args.filePath = arg;
    }
  }

  return args;
}

function usage(): string {
  return [
    'Uso:',
    '  npm run import:taco --workspace @smart-nutri/api -- --file ./TACO.xlsx',
    '  npm run import:taco --workspace @smart-nutri/api -- ./TACO.xlsx --sheet "Planilha1"'
  ].join('\n');
}

function resolveInputFilePath(inputPath: string): string {
  if (isAbsolute(inputPath)) {
    return inputPath;
  }

  const baseDirs = [process.env.INIT_CWD, process.cwd()]
    .filter((baseDir): baseDir is string => Boolean(baseDir));
  const candidates = [...new Set(baseDirs.map((baseDir) => resolve(baseDir, inputPath)))];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function stringFromCell(value: CellValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return '';
  }

  return String(value).trim();
}

function normalizeHeader(value: CellValue): string {
  return stringFromCell(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeFoodName(value: CellValue): string {
  return stringFromCell(value)
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim()
    .toLowerCase();
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

function parseDecimal(value: CellValue): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? roundToTwo(value) : null;
  }

  const text = stringFromCell(value).toLowerCase();

  if (!text || ['-', '--', 'na', 'nd', 'tr', '*'].includes(text)) {
    return null;
  }

  const compact = text.replace(/\s+/g, '').replace(/[^\d,.-]/g, '');

  if (!compact || compact === '-' || compact === ',') {
    return null;
  }

  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  let normalized = compact;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? compact.replace(/\./g, '').replace(',', '.')
      : compact.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = compact.replace(',', '.');
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) && parsed >= 0 ? roundToTwo(parsed) : null;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function findColumn(headers: string[], patterns: RegExp[]): number | null {
  const index = headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
  return index >= 0 ? index : null;
}

function buildHeaderCandidates(rows: SheetRow[], rowIndex: number): string[][] {
  const row = rows[rowIndex];
  const headerCandidates: string[][] = [];

  for (let startIndex = rowIndex; startIndex >= Math.max(0, rowIndex - 2); startIndex -= 1) {
    headerCandidates.push(
      row.map((_, columnIndex) => {
        return rows
          .slice(startIndex, rowIndex + 1)
          .map((candidateRow) => normalizeHeader(candidateRow[columnIndex]))
          .filter(Boolean)
          .join(' ');
      })
    );
  }

  return headerCandidates;
}

function detectColumns(rows: SheetRow[]): ColumnMapping {
  const maxHeaderSearchRows = Math.min(rows.length, 50);
  let bestMapping: ColumnMapping | null = null;
  let bestMappedNutrients = 0;

  for (let rowIndex = 0; rowIndex < maxHeaderSearchRows; rowIndex += 1) {
    for (const headers of buildHeaderCandidates(rows, rowIndex)) {
      const columns = {
        name: findColumn(headers, headerPatterns.name),
        tacoCode: findColumn(headers, headerPatterns.tacoCode),
        kcalPer100g: findColumn(headers, headerPatterns.kcalPer100g),
        carbsPer100g: findColumn(headers, headerPatterns.carbsPer100g),
        proteinPer100g: findColumn(headers, headerPatterns.proteinPer100g),
        fatPer100g: findColumn(headers, headerPatterns.fatPer100g),
        fiberPer100g: findColumn(headers, headerPatterns.fiberPer100g)
      };

      const mappedNutrients = nutrientKeys.filter((key) => columns[key] !== null).length;

      if (columns.name !== null && mappedNutrients >= 3) {
        const mapping = {
          headerRowIndex: rowIndex,
          columns: {
            name: columns.name,
            tacoCode: columns.tacoCode,
            kcalPer100g: columns.kcalPer100g,
            carbsPer100g: columns.carbsPer100g,
            proteinPer100g: columns.proteinPer100g,
            fatPer100g: columns.fatPer100g,
            fiberPer100g: columns.fiberPer100g
          }
        };

        if (mappedNutrients === nutrientKeys.length) {
          return mapping;
        }

        if (mappedNutrients > bestMappedNutrients) {
          bestMapping = mapping;
          bestMappedNutrients = mappedNutrients;
        }
      }
    }
  }

  if (bestMapping) {
    return bestMapping;
  }

  throw new Error('Nao foi possivel identificar as colunas principais da planilha TACO.');
}

function readCell(row: SheetRow, columnIndex: number | null): CellValue {
  return columnIndex === null ? null : row[columnIndex];
}

function hasMinimumNutrition(food: TacoFood): boolean {
  return nutrientKeys.some((key) => food[key] !== null);
}

function parseFoods(rows: SheetRow[], mapping: ColumnMapping): {
  foods: TacoFood[];
  skippedRows: number;
  duplicatedRows: number;
} {
  const foodsBySlug = new Map<string, TacoFood>();
  let skippedRows = 0;
  let duplicatedRows = 0;

  for (const row of rows.slice(mapping.headerRowIndex + 1)) {
    const name = normalizeFoodName(row[mapping.columns.name]);
    const slug = slugify(name);
    const tacoCode = stringFromCell(readCell(row, mapping.columns.tacoCode)) || null;

    const food: TacoFood = {
      name,
      slug,
      tacoCode,
      kcalPer100g: parseDecimal(readCell(row, mapping.columns.kcalPer100g)),
      carbsPer100g: parseDecimal(readCell(row, mapping.columns.carbsPer100g)),
      proteinPer100g: parseDecimal(readCell(row, mapping.columns.proteinPer100g)),
      fatPer100g: parseDecimal(readCell(row, mapping.columns.fatPer100g)),
      fiberPer100g: parseDecimal(readCell(row, mapping.columns.fiberPer100g))
    };

    if (!food.name || !food.slug || !hasMinimumNutrition(food)) {
      skippedRows += 1;
      continue;
    }

    if (foodsBySlug.has(food.slug)) {
      duplicatedRows += 1;
    }

    foodsBySlug.set(food.slug, food);
  }

  return {
    foods: [...foodsBySlug.values()],
    skippedRows,
    duplicatedRows
  };
}

function readWorkbookRows(filePath: string, sheetName: string | null): {
  rows: SheetRow[];
  selectedSheetName: string;
} {
  const workbook = XLSX.readFile(filePath, {
    cellDates: false,
    raw: true
  });

  const selectedSheetName = sheetName ?? workbook.SheetNames[0];
  const worksheet = selectedSheetName ? workbook.Sheets[selectedSheetName] : null;

  if (!selectedSheetName || !worksheet) {
    throw new Error(`Planilha nao encontrada: ${sheetName ?? '(primeira planilha)'}`);
  }

  const rows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, {
    header: 1,
    blankrows: false,
    defval: null,
    raw: true
  }) as SheetRow[];

  return {
    rows,
    selectedSheetName
  };
}

async function upsertFoods(foods: TacoFood[]): Promise<number> {
  if (foods.length === 0) {
    return 0;
  }

  const pool = createPool({
    ...env.mysql,
    namedPlaceholders: true,
    decimalNumbers: true
  });

  try {
    let affectedRows = 0;
    const chunkSize = 200;

    for (let startIndex = 0; startIndex < foods.length; startIndex += chunkSize) {
      const chunk = foods.slice(startIndex, startIndex + chunkSize);
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values = chunk.flatMap((food) => [
        food.name,
        food.slug,
        food.tacoCode,
        'TACO',
        food.kcalPer100g,
        food.carbsPer100g,
        food.proteinPer100g,
        food.fatPer100g,
        food.fiberPer100g
      ]);

      const [result] = await pool.query<ResultSetHeader>(
        `
          INSERT INTO foods (
            name,
            slug,
            taco_code,
            source,
            kcal_per_100g,
            carbs_per_100g,
            protein_per_100g,
            fat_per_100g,
            fiber_per_100g
          )
          VALUES ${placeholders}
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            taco_code = VALUES(taco_code),
            source = VALUES(source),
            kcal_per_100g = VALUES(kcal_per_100g),
            carbs_per_100g = VALUES(carbs_per_100g),
            protein_per_100g = VALUES(protein_per_100g),
            fat_per_100g = VALUES(fat_per_100g),
            fiber_per_100g = VALUES(fiber_per_100g),
            updated_at = CURRENT_TIMESTAMP
        `,
        values
      );

      affectedRows += result.affectedRows;
    }

    return affectedRows;
  } finally {
    await pool.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.filePath) {
    console.error(usage());
    process.exit(1);
  }

  const filePath = resolveInputFilePath(args.filePath);

  if (!existsSync(filePath)) {
    console.error(`Arquivo nao encontrado: ${filePath}`);
    process.exit(1);
  }

  console.log(`Lendo arquivo: ${filePath}`);

  const { rows, selectedSheetName } = readWorkbookRows(filePath, args.sheetName);
  const mapping = detectColumns(rows);
  const { foods, skippedRows, duplicatedRows } = parseFoods(rows, mapping);
  const affectedRows = await upsertFoods(foods);

  console.log(`Planilha: ${selectedSheetName}`);
  console.log(`Linha de cabecalho: ${mapping.headerRowIndex + 1}`);
  console.log(`Alimentos validos: ${foods.length}`);
  console.log(`Linhas ignoradas: ${skippedRows}`);
  console.log(`Duplicidades no arquivo: ${duplicatedRows}`);
  console.log(`Registros processados no banco: ${affectedRows}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erro inesperado ao importar TACO.';
  console.error(`Erro: ${message}`);
  process.exit(1);
});
