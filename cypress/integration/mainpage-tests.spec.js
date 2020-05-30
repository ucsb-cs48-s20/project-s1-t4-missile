describe('Main Page', () => {
    beforeEach(() => {
        cy.visit("http://localhost:3000");
        cy.viewport(1920 ,1080);
    })
    it('has a title', () => {
        cy.get('h1').should('exist');
    })    

})