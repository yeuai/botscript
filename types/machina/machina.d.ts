declare module 'machina' {

  type EventCallback = (data: any) => void

  interface Fsm {
    // static methods
    extend: ({ }) => Fsm
    // instance members
    initialState: string
    eventListeners: {}
    states: {}
    inputQueue: []
    namespace: string
    targetReplayState: string
    state: string
    priorState: string
    priorAction: string
    currentAction: string
    currentActionArgs: string
    initialize: () => void
    // prototype members
    emit: (eventName: string, data?: any) => void
    handle: (eventName: string, data: any) => void
    transition: (state: string) => void
    processQueue: (type: 'transition' | 'handler') => void
    clearQueue: (type?: 'transition' | 'handler', stateName?: string) => void
    deferUntilTransition: (stateName?: string) => void
    deferAndTransition: (stateName?: string) => void
    compositeState: () => string
    on: (eventName: string, callback: EventCallback) => void
    off: (eventName: string, callback: EventCallback) => void
  }

  interface BehavioralFsm {
    // static methods
    extend: ({ }) => BehavioralFsm
    // instance members
    initialState: string
    eventListeners: {}
    states: {}
    inputQueue: []
    namespace: string
    // prototype members
    initialize: () => void
    emit: (eventName: string, data?: any) => void
    handle: (client: Fsm, inputType: string, data: any) => void
    transition: (client: Fsm, state: string) => void
    processQueue: (client: Fsm) => void
    clearQueue: (client: Fsm, stateName?: string) => void
    deferUntilTransition: (client: Fsm, stateName?: string) => void
    deferAndTransition: (client: Fsm, stateName?: string) => void
    compositeState: (client: Fsm) => string
    on: (eventName: string, callback: (data?: any) => void) => void
    off: (eventName?: string, callback?: (data?: any) => void) => void
    // property to track machina-related metadata
    __machina__: {
      targetReplayState: string
      state: string
      priorState: string
      priorAction: string
      currentAction: string
      currentActionArgs: any[]
      initialize: () => void
      inputQueue: any[]
      inExitHandler: boolean
    }
  }

  const eventListeners: {}

  function emit(eventName: string, data?: any): void
  function on(eventName: string, callback: EventCallback): Subscription
  function off(eventName: string, callback: EventCallback): Subscription

  namespace utils {
    function makeFsmNamespace(): string
    function listenToChild(fsm: Fsm, child: Fsm): Subscription
    function getLeaklessArgs(): any[]
    function getDefaultOptions(): DefaultOptions
    function getDefaultClientMeta(): DefaultClientMeta
    function createUUID(): string
  }


  type DefaultOptions = {
    initialState: string
    eventListeners: {}
    states: {}
    namespace: string
    useSafeEmit: boolean
    hierarchy: {}
    pendingDelegations: {}
  }

  type DefaultClientMeta = {
    inputQueue: any[]
    targetReplayState: string
    state: string
    priorState: string
    priorAction: string
    currentAction: string
    currentActionArgs: any[]
    inExitHandler: boolean
  }

  interface Subscription {
    off: () => void
  }

  type TransitionEventData = {
    client?: string  // only applicable in BehavioralFsm instances
    fromState: string
    action: string
    toState: string
    namespace: string
  }

  type HandlingEventData = {
    client?: string  // only applicable in BehavioralFsm instances
    inputType: string
    delegated: boolean  // only applicable in hierarchical scenarios
    ticket: undefined // only applicable in hierarchical scenarios
    namespace: string
  }

  type HandledEventData = {
    client?: string  // only applicable in BehavioralFsm instances
    inputType: string
    delegated: boolean  // only applicable in hierarchical scenarios
    ticket: undefined  // only applicable in hierarchical scenarios
    namespace: string
  }

  type NohandlerEventData = {
    client?: string  // only applicable in BehavioralFsm instances
    inputType: string
    delegated: boolean  // only applicable in hierarchical scenarios
    ticket: undefined  // only applicable in hierarchical scenarios
    namespace: string
    args: any[]
  }

  type InvalidstateEventData = {
    client?: string  // only applicable in BehavioralFsm instances
    namespace: string
    state: string
    attemptedState: string
  }

  type QueuedArgs = {
    inputType: string
    delegated: boolean  // only applicable in hierarchical scenarios
    ticket: undefined  // only applicable in hierarchical scenarios
  }

  type DeferredEventData = {
    client?: string  // only applicable in BehavioralFsm instances
    state: string,
    namespace: string,
    queuedArgs: {
      args: QueuedArgs[]
      type: 'transition' // currently this is the only possible value
      untilState: string
    }
  }

}
