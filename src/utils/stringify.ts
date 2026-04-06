/**
 * Converts data to JSON string with optional pretty printing.
 * 
 * @param data - Data to stringify
 * @param pretty - Whether to use indentation (default: false)
 * @returns JSON string representation
 */
export function stringify(data: any, pretty = false): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}
