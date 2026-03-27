function noop() {}

function connectWithCustomMessagingProtocol() {
  return noop;
}

module.exports = {
  initialize: noop,
  connectToDevTools: noop,
  connectWithCustomMessagingProtocol,
};
