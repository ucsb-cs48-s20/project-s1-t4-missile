import Layout from "../components/IndexLayout.js";

const Index = () => {
  return (
    <div>
        <script type="text/javascript" src="/socket.io/socket.io.js"></script>
        <script type="text/javascript" src="//cdn.jsdelivr.net/npm/phaser@3.22.0/dist/phaser.js"></script>
      <Layout></Layout>
    </div>
  );
};

export default Index;