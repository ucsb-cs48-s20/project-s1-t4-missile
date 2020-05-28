import { angle } from '../utils/gameCalculations'

describe('utils/gameCalculations', () => {
    describe('angle', () => {
        it('calculates the angle between the two points for objects in Phaser in radians', () => {
            expect(angle(200, 100, 300, 600)).toBe(-0.19739555984988089);
        })
        it('returns Math.PI/2 if 0 < angle < Math.PI/2', () => {
            expect(angle(270, 200, 160, 130)).toBe(Math.PI / 2);
        })
        it('returns 3*Math.PI/2 if angle >= Math.PI/2', () => {
            expect(angle(50, 100, 1010, 10)).toBe(3 * Math.PI / 2);
        })
        it('throws an error when any parameter is not of type number', () => {
            expect(() => {
                angle('x', 0, 20, 40)
            }).toThrow('all arguments must be numbers');
        })
    })
})