import { exec } from 'child_process';
import React from 'react';
import moment from 'moment';
import { render, Box, Color } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';

import { fetchConnectionStatus } from './utilities';

const dateFormat = 'DD_MM_YYYY';
const dividerLength = 36;
const dividerChar = '-';
const dividerString = dividerChar.repeat(dividerLength);
const versionTextMatch = new RegExp('^OpenVPN');

class ConnectionDialog extends React.PureComponent {
  constructor() {
    super();

    this.state = {
      version: '-',
      status: '-',
      connectionOptions: [],
      mode: 'option',
      inputValue: '',
      logFilename: '',
      versionInfoProcess: null,
      logOutputProcess: null,
      connectionFilesProcess: null,
      connectionProcess: null,
    };
    this.killProcess = this.killProcess.bind(this);
    this.fetchVersionInfo = this.fetchVersionInfo.bind(this);
    this.fetchConnectionStatus = this.fetchConnectionStatus.bind(this);
    this.fetchConnectionOptions = this.fetchConnectionOptions.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleInputSubmit = this.handleInputSubmit.bind(this);
    this.handleConnectionSelection = this.handleConnectionSelection.bind(this);
    this.renderVersionInfo = this.renderVersionInfo.bind(this);
    this.renderConnectionStatus = this.renderConnectionStatus.bind(this);
    this.renderConnectionSelection = this.renderConnectionSelection.bind(this);
  }

  componentDidMount() {
    this.fetchVersionInfo();
    this.fetchConnectionOptions();
  }

  componentWillUnmount() {
    this.killAllActiveProcesses();
  }

  killActiveConnection() {
    this.killProcess('connectionProcess');
  }

  killAllActiveProcesses() {
    const processKeys = ['versionInfoProcess', 'logOutputProcess', 'connectionFilesProcess', 'connectionProcess'];
    processKeys.forEach(key => this.killProcess(key));
  }

  killProcess(processKey) {
    const process = this.state[processKey];
    if (!!process && process.hasOwnProperty('kill')) value.kill();
  }

  fetchVersionInfo() {
    const versionInfoProcess = exec('openvpn --version');
    versionInfoProcess.stdout.on('data', data => {
      const versionOutput = data.split('\n');
      versionOutput.forEach(line => {
        if (versionTextMatch.test(line)) {
          const displayText = line.split('[')[0];
          this.setState({
            version: displayText,
          });
        }
      });
    });
    this.setState({
      versionInfoProcess,
    });
  }

  fetchConnectionStatus(filename) {
    const logOutputProcess = exec(`sudo tail -8f ${filename}`);
    logOutputProcess.stdout.on('data', data => {
      this.setState({
        status: data,
      });
    });
    this.setState({
      logOutputProcess,
    });
  }

  fetchConnectionOptions() {
    const connectionFilesProcess = exec('ls /etc/openvpn/client/config');
    connectionFilesProcess.stdout.on('data', data => {
      const rawOptions = data.split('\n');
      const connectionOptions = rawOptions.slice(0, rawOptions.length - 1);
      this.setState({
        connectionOptions,
      });
    });
    this.setState({
      connectionFilesProcess,
    });
  }

  handleInputChange(inputValue) {
    this.setState({ inputValue });
  }

  handleInputSubmit() {
    const { inputValue } = this.state;

    switch (inputValue) {
      case 'c':
        this.killActiveConnection();
        this.setState({
          mode: 'option',
          inputValue: '',
        });
        break;
      case 's':
        this.setState({
          mode: 'select',
          inputValue: '',
        });
        break;
      case 'e':
        this.killAllActiveProcesses();
        this.setState({
          mode: 'exit',
          inputValue: '',
        });
        break;
      default:
        this.setState({
          mode: 'option',
          inputValue: '',
        });
    }
  }

  handleConnectionSelection(item) {
    const logFilename = `/etc/openvpn/client/log/${moment().format(dateFormat)}.log`;
    const connectionCommand = `sudo openvpn --config ~/script/resource/${item.value} --log ${logFilename}`;
    const connectionProcess = exec(connectionCommand);
    this.fetchConnectionStatus(logFilename);
    this.setState({
      mode: 'option',
      inputValue: '',
      logFilename,
      connectionProcess,
    });
  }

  renderDivider(title = 'default') {
    const titleLength = title.length;
    const titlePrepend = dividerChar.repeat(4);
    const titleAppend = dividerChar.repeat(dividerLength - 6 - titleLength);
    const titleString = `${titlePrepend} ${title} ${titleAppend}`;
    return (
      <div>
        <Color yellow>{dividerString}</Color>
        <Color yellow>{titleString}</Color>
        <Color yellow>{dividerString}</Color>
      </div>
    );
  }

  renderVersionInfo() {
    return <Box>{this.state.version}</Box>;
  }

  renderConnectionStatus() {
    return <Box>{this.state.status}</Box>;
  }

  renderModeOptions() {
    const { inputValue } = this.state;
    return (
      <div>
        <Box>[c]lose connection [s]elect new connection [e]xit</Box>
        <TextInput value={inputValue} onChange={this.handleInputChange} onSubmit={this.handleInputSubmit} />
      </div>
    );
  }

  renderConnectionSelection() {
    const { connectionOptions } = this.state;
    const items = connectionOptions.map(connection => ({ label: connection, value: connection }));
    return <SelectInput items={items} onSelect={this.handleConnectionSelection} />;
  }

  render() {
    const { mode } = this.state;
    return (
      <Box width={'100%'} flexDirection={'column'}>
        {this.renderDivider('version')}
        {this.renderVersionInfo()}
        {this.renderDivider('status')}
        {this.renderConnectionStatus()}
        {this.renderDivider(mode)}
        {mode === 'option' && this.renderModeOptions()}
        {mode === 'select' && this.renderConnectionSelection()}
      </Box>
    );
  }
}

render(<ConnectionDialog />);
