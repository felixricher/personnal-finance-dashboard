import Papa from 'papaparse';
import { parse, isValid, compareAsc } from 'date-fns';

export interface ParsedInvestmentData {
  investments: {
    id: string;
    name: string;
    type: string;
    amount: number;
  }[];
  history: {
    date: string;
    total: number;
    breakdown: Record<string, number>;
  }[];
}

export const parseGoogleSheetCSV = (csvText: string): ParsedInvestmentData => {
  // Check for HTML content (common mistake: using the edit URL or not publishing correctly)
  if (csvText.trim().toLowerCase().startsWith('<!doctype html') || csvText.trim().toLowerCase().startsWith('<html')) {
    throw new Error("L'URL fournie renvoie une page web au lieu d'un fichier CSV. Assurez-vous d'avoir sélectionné 'Valeurs séparées par des virgules (.csv)' dans la fenêtre 'Publier sur le web'.");
  }

  const result = Papa.parse<string[]>(csvText, {
    header: false, // We'll handle headers manually to find date columns
    skipEmptyLines: true,
  });

  const rows = result.data;
  if (rows.length < 2) {
    console.error("CSV Parse Error: Not enough rows", rows);
    throw new Error("Le fichier CSV semble vide ou mal formaté. Il doit contenir au moins une ligne d'en-tête et une ligne de données.");
  }

  // 1. Identify Header Row (usually the first one)
  const headerRow = rows[0];
  const dateColumns: { index: number; date: Date }[] = [];

  // Find columns that look like dates (YYYY-MM-DD or similar)
  headerRow.forEach((cell, index) => {
    // Try parsing as date
    // The format in the example is YYYY-MM-DD (e.g., 2024-11-01)
    if (index < 2) return; // Skip "Emplacement" and "Type de compte"

    const date = parse(cell, 'yyyy-MM-dd', new Date());
    if (isValid(date)) {
      dateColumns.push({ index, date });
    }
  });

  // Sort date columns just in case
  dateColumns.sort((a, b) => compareAsc(a.date, b.date));

  // 2. Process Data Rows
  const investments: { id: string; name: string; type: string; amount: number }[] = [];
  const historyMap: Record<string, { total: number; breakdown: Record<string, number> }> = {};

  // Initialize history map with 0s
  dateColumns.forEach(col => {
    const dateStr = col.date.toISOString().split('T')[0];
    historyMap[dateStr] = { total: 0, breakdown: {} };
  });

  // Iterate over rows
  // Skip header
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const emplacement = row[0]?.trim();
    const type = row[1]?.trim();

    // Filter out invalid rows
    // Valid rows have a non-empty Emplacement and are not "Total" or "Variation..."
    if (!emplacement || emplacement.toLowerCase().startsWith('total') || emplacement.toLowerCase().startsWith('variation')) {
      continue;
    }

    // Also filter out summary rows at the bottom (where Emplacement is empty, but we already checked !emplacement)
    // The example shows summary rows like ",REER,..." -> Emplacement is empty string.
    
    const name = `${emplacement} - ${type}`;
    const id = `${emplacement}-${type}`.replace(/\s+/g, '-').toLowerCase();

    // Process each date column for this row
    let latestAmount = 0;
    let hasLatestAmount = false;

    dateColumns.forEach(col => {
      const cellValue = row[col.index];
      let amount = 0;

      if (cellValue) {
        // Parse currency string: "$13,331.43" -> 13331.43
        // Remove '$', ',', spaces
        const cleanValue = cellValue.replace(/[$,\s]/g, '');
        const parsed = parseFloat(cleanValue);
        if (!isNaN(parsed)) {
          amount = parsed;
        }
      }

      // Update history
      const dateStr = col.date.toISOString().split('T')[0];
      if (historyMap[dateStr]) {
        historyMap[dateStr].total += amount;
        
        // Group by type for breakdown (e.g., REER, CELI)
        if (!historyMap[dateStr].breakdown[type]) {
            historyMap[dateStr].breakdown[type] = 0;
        }
        historyMap[dateStr].breakdown[type] += amount;
      }

      // Track latest non-zero amount (or just the latest column's amount if it exists)
      // The example shows empty cells for future dates.
      // We want the amount from the *last column that has a value*?
      // Or just the amount from the *current month*?
      // Let's assume the right-most non-empty value is the current value.
      if (cellValue && cellValue.trim() !== '') {
          latestAmount = amount;
          hasLatestAmount = true;
      }
    });

    if (hasLatestAmount && latestAmount > 0) {
        investments.push({
            id,
            name,
            type, // Use the "Type de compte" as the category
            amount: latestAmount
        });
    }
  }

  // Convert history map to array
  const history = Object.entries(historyMap)
    .map(([date, data]) => ({
      date,
      total: data.total,
      breakdown: data.breakdown
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    // Filter out future dates with 0 total if desired, or keep them.
    // The example has future dates with empty values, which parsed to 0.
    // Let's filter out dates where total is 0, assuming the user has *some* money.
    .filter(h => h.total > 0);

  return { investments, history };
};
