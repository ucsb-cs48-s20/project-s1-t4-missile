import { distance } from '../utils/serverCalculations'

describe('utils/serverCalculations', () => {
    describe('distance', () => {
        it('calculates the distance between 2 points', () => {
            expect(distance(200, 100, 300, 600)).toBe(509.9019513592785);
        })
        it('throws an error when any parameter is not of type number', () => {
            expect(() => {
                distance('x', 0, 20, 40)
            }).toThrow('all arguments must be numbers');
        })
    })
})