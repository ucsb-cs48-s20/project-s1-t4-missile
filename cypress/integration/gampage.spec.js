describe('Game Page', () => {
    beforeEach(() => {
        cy.visit("http://localhost:3000");
    })
    it('has a title', () => {
        cy.get('h1').should('exist');
    })
})
