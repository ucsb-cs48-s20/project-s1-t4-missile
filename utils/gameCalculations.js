function throwError(message) {
    throw new Error(message);
}

export const angle = (x1, y1, x2, y2) => {
    typeof x1 === 'number' && typeof y1 === 'number' && typeof x2 === 'number' && typeof y2 === 'number' || throwError('all arguments must be numbers');
    let mvtAngle = Math.atan2(
        y1 - y2,
        x1 - x2
    );
    if (mvtAngle > 0.0) {
        if (mvtAngle < Math.PI * 0.5) {
            mvtAngle = 0.0;
        } else {
            mvtAngle = Math.PI;
        }
    }

    return mvtAngle + Math.PI * 0.5;
}