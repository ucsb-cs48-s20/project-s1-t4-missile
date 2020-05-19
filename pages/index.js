import { Component } from 'react'
import Favicon from 'react-favicon'
import dynamic from 'next/dynamic'
import styles from '../components/styles'

const DynamicGameWindow = dynamic(
    () => import("../components/gameWindow"),
    { ssr: false }
)

class Test extends Component {
    constructor(props) {
        super(props)
        
        this.state = {
            pageTitle: 'Missile Defense Game'
        }
    }

    componentDidMount() {
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
                <DynamicGameWindow />
                <script type='module' src='/static/game.js'></script>
                <script src='/static/parentGameWindow.js'></script>
                <script src="/socket.io/socket.io.js"></script>
                <script src="//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js"></script>
            </div>
        )
    }
}

export default Test