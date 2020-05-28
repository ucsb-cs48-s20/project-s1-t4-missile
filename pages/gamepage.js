import { Component } from 'react'
import Favicon from 'react-favicon'
import dynamic from 'next/dynamic'
import styles from '../components/styles'

const DynamicGameWindow = dynamic(
    () => import("../components/GameWindow"),
    { ssr: false }
)

class Test extends Component {
    constructor(props) {
        super(props)
        this.state = {
            pageTitle: 'Missile Defense Game',
            oldBodyStyle: ''
        }
    }

    componentDidUpdate() {
        //set body style
        this.state.oldBodyStyle = document.body.style;
        document.title = this.state.pageTitle;

        for (var i in styles.body) {
            if (styles.body.hasOwnProperty(i)) {
                document.body.style[i] = styles.body[i];
            }
        }
    }

    componentDidMount() {
        //set body style
        this.state.oldBodyStyle = document.body.style;
        document.title = this.state.pageTitle;

        for (var i in styles.body) {
            if (styles.body.hasOwnProperty(i)) {
                document.body.style[i] = styles.body[i];
            }
        }
    }

    componentWillUnmount() {
        //reset body style
        document.body.style = this.state.oldBodyStyle;
    }

    render() {
        return (
            <div style={styles.container}>
                <Favicon url="/static/images/favicon.ico"></Favicon>
                <h1>{this.state.pageTitle}</h1>
                <script type='module' src='/static/game.js'></script>
                <script src='/static/parentGameWindow.js'></script>
                <DynamicGameWindow />
                <script type="text/javascript" src="/socket.io/socket.io.js"></script>
                <script type="text/javascript" src="//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js"></script>
            </div>
        )
    }
}

export default Test
               