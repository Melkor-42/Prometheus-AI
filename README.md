# Prometheus AI

A decentralized platform for sharing access to local LLMs (Large Language Models) using peer-to-peer technology.

## Project Vision

Prometheus AI aims to democratize access to powerful AI by enabling users to share their local LLM instances with others through a decentralized P2P infrastructure. Named after the Titan who gave fire to humanity, this project brings AI capabilities to users without requiring them to have powerful hardware or API subscriptions.

## Key Features

- **Decentralized P2P Architecture**: Built on [Holepunch](https://holepunch.to/)'s Hyperswarm for true peer-to-peer connections without central servers
- **LLM Sharing**: Host your local LLM and share access with others in your network
- **Chat Interface**: Intuitive chat UI for interaction with shared LLMs
- **Identity Management**: Simple user identification system for P2P communication
- **Multiple LLM Support**: Pluggable architecture supporting different LLM providers

## How It Works

### Backend (prometheus-pear)

The backend is built using Holepunch's P2P primitives and runs as a Pear desktop application:

- **P2P Networking**: Uses Hyperswarm for peer discovery and connection management
- **Cryptographic Room Creation**: Creates secure chat rooms using crypto key pairs
- **Message Routing**: Routes messages between peers and the hosted LLM
- **LLM Integration**: Connects to local or remote LLMs via pluggable providers:
  - Support for Venice AI API
  - Mock provider for testing
  - Extensible for additional providers

The backend handles:
1. Room creation with unique cryptographic identifiers
2. Peer discovery and connection management
3. Message passing between users in the network
4. Routing user queries to the LLM and broadcasting responses

### Frontend

The frontend is built with React, TypeScript, and Tailwind CSS, providing:

- **Welcome Page**: Options to create a room (as host) or join existing rooms
- **Host Configuration**: Interface for configuring LLM settings
- **Chat Interface**: Real-time messaging with message history and participant list
- **Dark/Light Mode**: Theme switching for user preference

## Getting Started

### Prerequisites

- Node.js (latest LTS version recommended)
- Pear (for development and packaging)

### Development

1. Clone the repository
```
git clone https://github.com/yourusername/prometheus-ai.git
cd prometheus-ai
```

2. Install dependencies
```
npm install
cd prometheus-pear
npm install
```

3. Run the application
```
cd prometheus-pear
npm run dev
```

## Architecture

The application is structured in two main parts:

1. **Pear Backend** (`prometheus-pear/`): P2P networking, LLM integration, and message handling
2. **Frontend** (`src/`): User interface components and pages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under [add your license] - see the LICENSE file for details.

## Acknowledgments

- [Holepunch](https://holepunch.to/) for the P2P infrastructure
- All contributors and testers
