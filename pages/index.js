import { Component } from 'react'
import io from 'socket.io-client'
import { render } from 'react-dom'
import Favicon from 'react-favicon'

const styles = {
    body: {
        backgroundColor: '#444444',
        backgroundImage: 'url("/static/images/webpage-background.png")',
        fontFamily: '"Trebuchet MS", Roboto, sans-serif',
        color: '#eeeeee'
    },

    container: {
        textAlign: 'center',
    },

    gameWindow: {
        padding: '5px',
        border: '1px solid #eeeeee',
    },

}

class Test extends Component {
    constructor(props) {
        super(props)
        
        this.state = {
            pageTitle: 'Missile Defense Game'
        }
    }

    componentDidMount() {
        /*
        this.socket = io();
        this.socket.on('now', data => {
            this.setState({
                hello: data.message
            })
        });
        */

        //set body style
        document.title = this.state.pageTitle;
        var oldBodyStyle = document.body.style;

        for (var i in styles.body) {
            if (styles.body.hasOwnProperty(i)) {           
                document.body.style[i] = styles.body[i];
            }
        }
    }

    componentWillUnmount() {
        //reset body style
        document.body.style = oldBodyStyle;
    }

    render() {
        return (
            <div style={styles.container}>
                <Favicon url="/static/images/favicon.ico"></Favicon>
                <h1>{this.state.pageTitle}</h1>
                <script src="/socket.io/socket.io.js"></script>
                <script src="//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js"></script>
                <script type='module' src='/static/game.js'></script>
                <div id="gameWindow" style={styles.gameWindow}></div>
            </div>
        )
    }
}

export default Test
