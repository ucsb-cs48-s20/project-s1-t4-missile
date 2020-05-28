function throwError(message) {
    throw new Error(message);
}

const distance = (x1, y1, x2, y2) => {
    typeof x1 === 'number' && typeof y1 === 'number' && typeof x2 === 'number' && typeof y2 === 'number' || throwError('all arguments must be numbers');
    return Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));
}
module.exports = { distance }