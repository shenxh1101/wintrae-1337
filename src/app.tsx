import { Component, PropsWithChildren } from 'react';
import { AppProvider } from '@/store/AppContext';
import './app.scss';

class App extends Component<PropsWithChildren> {
  componentDidMount() {}

  componentDidShow() {}

  componentDidHide() {}

  render() {
    return <AppProvider>{this.props.children}</AppProvider>;
  }
}

export default App;
