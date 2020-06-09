import Layout from "../components/IndexLayout.js";
import Favicon from "react-favicon";

const Index = () => {
  return (
    <div>
      <Favicon url="/assets/site/favicon.ico"></Favicon>
      <Layout></Layout>
    </div>
  );
};

export default Index;