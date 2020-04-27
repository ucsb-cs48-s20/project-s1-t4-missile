import { Component } from 'react'
import io from 'socket.io-client'
import { render } from 'react-dom'

class Test extends Component {
    constructor(props) {
        super(props)
        
        this.state = {
            pageTitle: 'Missile Defense Game'
        }
    }

    componentDidMount() {
        /*this.socket = io();
        this.socket.on('now', data => {
            this.setState({
                hello: data.message
            })
        });*/
        document.title = this.state.pageTitle;
    }

    render() {
        return (
            <div>
                <h1>{this.state.pageTitle}</h1>
                <script src="/socket.io/socket.io.js"></script>
                <script src="//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js"></script>
                <script type='module' src='/static/game.js'></script>
            </div>
        )
    }
}

export default Test
