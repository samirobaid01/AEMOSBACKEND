const addMock = jest.fn();

class Queue {
  constructor() {}
  add = addMock;
}

class Worker {
  constructor(name, processor) {
    this.processor = processor;
  }
}

module.exports = {
  Queue,
  Worker,
  __addMock: addMock
};
