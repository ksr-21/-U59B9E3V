
/**
 * Utility functions for handling CSV import and export.
 */

/**
 * Converts an array of objects to a CSV string.
 */
export const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => 
    headers.map(header => {
      const val = obj[header];
      // Escape commas and quotes
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

/**
 * Triggers a browser download of a CSV file.
 */
export const downloadCSV = (csvContent: string, fileName: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Simple CSV parser that converts a string to an array of objects.
 * Assumes first row is headers.
 */
export const parseCSV = (csvText: string): any[] => {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Regex to handle commas inside quoted strings
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const obj: any = {};
    headers.forEach((header, i) => {
      let val = values[i] ? values[i].trim().replace(/^"|"$/g, '') : '';
      // Attempt to convert numbers
      if (!isNaN(val as any) && val !== '') {
        obj[header] = Number(val);
      } else {
        obj[header] = val;
      }
    });
    return obj;
  });
};
