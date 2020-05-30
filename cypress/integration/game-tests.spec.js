describe('Game Window', () => {
    beforeEach(() => {
        cy.visit("http://localhost:3000");
        cy.viewport(1920 ,1080);
    })

    it ('has a game window', () => {
        cy.get('canvas').should('exist');
    })

    it ('correctly parents the game window', () => {
        cy.get('canvas').parent().should('have.id', 'gameWindow');
    })

})
