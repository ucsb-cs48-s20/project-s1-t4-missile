/* Calculates the correct Phaser angle between (x1,y1) and (x2,y2) */
export const angle = (x1, y1, x2, y2) => {

    /* Checks if the arguments are all numbers, prints out the ones that are not */
    let invalid = '';
    if (typeof x1 === 'number') { invalid += ' x1 is not a number\n' }
    if (typeof y1 === 'number') { invalid += ' y1 is not a number\n' }
    if (typeof x2 === 'number') { invalid += ' x2 is not a number\n' }
    if (typeof y2 === 'number') { invalid += ' y2 is not a number\n' }
    if (invalid != '') { throw new Error(`All arguments must be numbers.\n${invalid}`); }

    /* Calculates the angle */
    let mvtAngle = Math.atan2((y1 - y2), (x1 - x2));
    if (mvtAngle > 0.0) {
        if (mvtAngle < Math.PI * 0.5) {
            mvtAngle = 0.0;
        } else {
            mvtAngle = Math.PI;
        }
    }
    return mvtAngle + Math.PI * 0.5;
}
