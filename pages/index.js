import { Component } from 'react'
import io from 'socket.io-client'
import { render } from 'react-dom'

const styles = {
    body: {
        backgroundColor: '#888888',
    },

    container: {
        textAlign: 'center',
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
                <h1>{this.state.pageTitle}</h1>
                <script src="/socket.io/socket.io.js"></script>
                <script src="//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js"></script>
                <script type='module' src='/static/game.js'></script>
                <div id="gameWindow"></div>
            </div>
        )
    }
}

export default Test
