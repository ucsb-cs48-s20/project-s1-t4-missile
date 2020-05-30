describe('Chat Window', () => {
    beforeEach(() => {
        cy.visit("http://localhost:3000");
        cy.viewport(1920 ,1080);
    })

    it ('has a chat window', () => {
        cy.get('div[class="outerContainer"]').should('exist');
    })

    it ('correctly parents the chat window', () => {
        cy.get('div[class="outerContainer"]').parent().should('have.class', 'main');
    })

    it ('chat box is valid focus', () => {
        cy.get('div[class="main"] input:first').focus();
    })

    it ('can submit and view my own messages', () => {
        cy.get('div[class="main"] input:first').type('Hello from cypress!');
        cy.get('div[class="main"] button:first').click();
        cy.get('div[class="messageBox backgroundBlue"]:last').should('exist').should('have.text', 'Hello from cypress!');

        cy.get('div[class="main"] input:first').type('This is my second message.');
        cy.get('div[class="main"] button:first').click();
        cy.get('div[class="messageBox backgroundBlue"]:last').should('have.text', 'This is my second message.');
    })

    it ('can see other messages', () => {
        //cypress can't seem to open multiple tabs.
        //so this just looks for the welcome player message from the server
        cy.get('div[class="messageBox backgroundLight"]').should('exist');
    })

})
