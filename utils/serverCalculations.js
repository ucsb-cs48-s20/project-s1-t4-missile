/* Calculates the distance between (x1,y1) and (x2,y2) */
export const distance = (x1, y1, x2, y2) => {
    let invalid = '';
    if (typeof x1 != 'number') { invalid += ' x1 is not a number\n' }
    if (typeof y1 != 'number') { invalid += ' y1 is not a number\n' }
    if (typeof x2 != 'number') { invalid += ' x2 is not a number\n' }
    if (typeof y2 != 'number') { invalid += ' y2 is not a number\n' }
    if (invalid != '') { throw new Error(`All arguments must be numbers.\n${invalid}`); }
    return Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
}
