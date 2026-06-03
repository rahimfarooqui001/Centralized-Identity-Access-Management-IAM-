// events/eventBus.js
import EventEmitter from "events";

const eventBus = new EventEmitter();

//  avoid memory leak warnings
eventBus.setMaxListeners(50);

export default eventBus;