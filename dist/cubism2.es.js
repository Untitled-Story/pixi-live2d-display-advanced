var __defProp = Object.defineProperty;
var __pow = Math.pow;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
import { utils as utils$3, Matrix, Texture, Transform, Point, ObservablePoint } from "@pixi/core";
import { Container } from "@pixi/display";
const LOGICAL_WIDTH = 2;
const LOGICAL_HEIGHT = 2;
var CubismConfig;
((CubismConfig2) => {
  CubismConfig2.supportMoreMaskDivisions = true;
  CubismConfig2.setOpacityFromMotion = false;
})(CubismConfig || (CubismConfig = {}));
const LOG_LEVEL_VERBOSE = 0;
const LOG_LEVEL_WARNING = 1;
const LOG_LEVEL_ERROR = 2;
const LOG_LEVEL_NONE = 999;
const config = {
  LOG_LEVEL_VERBOSE,
  LOG_LEVEL_WARNING,
  LOG_LEVEL_ERROR,
  LOG_LEVEL_NONE,
  /**
   * Global log level.
   * @default config.LOG_LEVEL_WARNING
   */
  logLevel: LOG_LEVEL_WARNING,
  /**
   * Enabling sound for motions.
   */
  sound: true,
  /**
   * fftSize for sound analyzer for lipsync.
   * Must be a power of 2 between 2^5 and 2^15, so one of: 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, and 32768.
   * @default 512
   */
  fftSize: 512,
  /**
   * Deferring motion and corresponding sound until both are loaded.
   */
  motionSync: true,
  /**
   * Default fading duration for motions without such value specified.
   */
  motionFadingDuration: 500,
  /**
   * Default fading duration for idle motions without such value specified.
   */
  idleMotionFadingDuration: 2e3,
  /**
   * Default fading duration for expressions without such value specified.
   */
  expressionFadingDuration: 500,
  /**
   * If false, expression will be reset to default when playing non-idle motions.
   */
  preserveExpressionOnMotion: true,
  cubism4: CubismConfig
};
const VERSION = "v0.5.0-mm-5";
const logger = {
  log(tag, ...messages) {
    if (config.logLevel <= config.LOG_LEVEL_VERBOSE) {
      console.log(`[${tag}]`, ...messages);
    }
  },
  warn(tag, ...messages) {
    if (config.logLevel <= config.LOG_LEVEL_WARNING) {
      console.warn(`[${tag}]`, ...messages);
    }
  },
  error(tag, ...messages) {
    if (config.logLevel <= config.LOG_LEVEL_ERROR) {
      console.error(`[${tag}]`, ...messages);
    }
  }
};
function clamp(num, lower, upper) {
  return num < lower ? lower : num > upper ? upper : num;
}
function rand(min, max2) {
  return Math.random() * (max2 - min) + min;
}
function copyProperty(type2, from, to, fromKey, toKey) {
  const value = from[fromKey];
  if (value !== null && typeof value === type2) {
    to[toKey] = value;
  }
}
function copyArray(type2, from, to, fromKey, toKey) {
  const array = from[fromKey];
  if (Array.isArray(array)) {
    to[toKey] = array.filter((item) => item !== null && typeof item === type2);
  }
}
function applyMixins(derivedCtor, baseCtors) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name !== "constructor") {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name)
        );
      }
    });
  });
}
function folderName(url2) {
  let lastSlashIndex = url2.lastIndexOf("/");
  if (lastSlashIndex != -1) {
    url2 = url2.slice(0, lastSlashIndex);
  }
  lastSlashIndex = url2.lastIndexOf("/");
  if (lastSlashIndex !== -1) {
    url2 = url2.slice(lastSlashIndex + 1);
  }
  return url2;
}
function remove(array, item) {
  const index = array.indexOf(item);
  if (index !== -1) {
    array.splice(index, 1);
  }
}
class ExpressionManager extends utils$3.EventEmitter {
  constructor(settings, options) {
    super();
    /**
     * Tag for logging.
     */
    __publicField(this, "tag");
    /**
     * The ModelSettings reference.
     */
    __publicField(this, "settings");
    /**
     * The Expressions. The structure is the same as {@link definitions}, initially there's only
     * an empty array, which means all expressions will be `undefined`. When an Expression has
     * been loaded, it'll fill the place in which it should be; when it fails to load,
     * the place will be filled with `null`.
     */
    __publicField(this, "expressions", []);
    /**
     * An empty Expression to reset all the expression parameters.
     */
    __publicField(this, "defaultExpression");
    /**
     * Current Expression. This will not be overwritten by {@link ExpressionManager#defaultExpression}.
     */
    __publicField(this, "currentExpression");
    /**
     * The pending Expression.
     */
    __publicField(this, "reserveExpressionIndex", -1);
    /**
     * Flags the instance has been destroyed.
     */
    __publicField(this, "destroyed", false);
    this.settings = settings;
    this.tag = `ExpressionManager(${settings.name})`;
  }
  /**
   * Should be called in the constructor of derived class.
   */
  init() {
    this.defaultExpression = this.createExpression({}, void 0);
    this.currentExpression = this.defaultExpression;
    this.stopAllExpressions();
  }
  /**
   * Loads an Expression. Errors in this method will not be thrown,
   * but be emitted with an "expressionLoadError" event.
   * @param index - Index of the expression in definitions.
   * @return Promise that resolves with the Expression, or with undefined if it can't be loaded.
   * @emits {@link ExpressionManagerEvents.expressionLoaded}
   * @emits {@link ExpressionManagerEvents.expressionLoadError}
   */
  loadExpression(index) {
    return __async(this, null, function* () {
      if (!this.definitions[index]) {
        logger.warn(this.tag, `Undefined expression at [${index}]`);
        return void 0;
      }
      if (this.expressions[index] === null) {
        logger.warn(
          this.tag,
          `Cannot set expression at [${index}] because it's already failed in loading.`
        );
        return void 0;
      }
      if (this.expressions[index]) {
        return this.expressions[index];
      }
      const expression = yield this._loadExpression(index);
      this.expressions[index] = expression;
      return expression;
    });
  }
  /**
   * Loads the Expression. Will be implemented by Live2DFactory in order to avoid circular dependency.
   * @ignore
   */
  _loadExpression(index) {
    throw new Error("Not implemented.");
  }
  /**
   * Sets a random Expression that differs from current one.
   * @return Promise that resolves with true if succeeded, with false otherwise.
   */
  setRandomExpression() {
    return __async(this, null, function* () {
      if (this.definitions.length) {
        const availableIndices = [];
        for (let i = 0; i < this.definitions.length; i++) {
          if (this.expressions[i] !== null && this.expressions[i] !== this.currentExpression && i !== this.reserveExpressionIndex) {
            availableIndices.push(i);
          }
        }
        if (availableIndices.length) {
          const index = Math.floor(Math.random() * availableIndices.length);
          return this.setExpression(index);
        }
      }
      return false;
    });
  }
  /**
   * Resets model's expression using {@link ExpressionManager#defaultExpression}.
   */
  resetExpression() {
    this._setExpression(this.defaultExpression);
  }
  /**
   * Restores model's expression to {@link currentExpression}.
   */
  restoreExpression() {
    this._setExpression(this.currentExpression);
  }
  /**
   * Sets an Expression.
   * @param index - Either the index, or the name of the expression.
   * @return Promise that resolves with true if succeeded, with false otherwise.
   */
  setExpression(index) {
    return __async(this, null, function* () {
      if (typeof index !== "number") {
        index = this.getExpressionIndex(index);
      }
      if (!(index > -1 && index < this.definitions.length)) {
        return false;
      }
      if (index === this.expressions.indexOf(this.currentExpression)) {
        return false;
      }
      this.reserveExpressionIndex = index;
      const expression = yield this.loadExpression(index);
      if (!expression || this.reserveExpressionIndex !== index) {
        return false;
      }
      this.reserveExpressionIndex = -1;
      this.currentExpression = expression;
      this._setExpression(expression);
      return true;
    });
  }
  /**
   * Updates parameters of the core model.
   * @return True if the parameters are actually updated.
   */
  update(model, now) {
    if (!this.isFinished()) {
      return this.updateParameters(model, now);
    }
    return false;
  }
  /**
   * Destroys the instance.
   * @emits {@link ExpressionManagerEvents.destroy}
   */
  destroy() {
    this.destroyed = true;
    this.emit("destroy");
    const self2 = this;
    self2.definitions = void 0;
    self2.expressions = void 0;
  }
}
const EPSILON = 0.01;
const MAX_SPEED = 40 / 7.5;
const ACCELERATION_TIME = 1 / (0.15 * 1e3);
class FocusController {
  constructor() {
    /** The focus position. */
    __publicField(this, "targetX", 0);
    /** The focus position. */
    __publicField(this, "targetY", 0);
    /** Current position. */
    __publicField(this, "x", 0);
    /** Current position. */
    __publicField(this, "y", 0);
    /** Current velocity. */
    __publicField(this, "vx", 0);
    /** Current velocity. */
    __publicField(this, "vy", 0);
  }
  /**
   * Sets the focus position.
   * @param x - X position in range `[-1, 1]`.
   * @param y - Y position in range `[-1, 1]`.
   * @param instant - Should the focus position be instantly applied.
   */
  focus(x, y, instant = false) {
    this.targetX = clamp(x, -1, 1);
    this.targetY = clamp(y, -1, 1);
    if (instant) {
      this.x = this.targetX;
      this.y = this.targetY;
    }
  }
  /**
   * Updates the interpolation.
   * @param dt - Delta time in milliseconds.
   */
  update(dt) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    if (Math.abs(dx) < EPSILON && Math.abs(dy) < EPSILON)
      return;
    const d = Math.sqrt(__pow(dx, 2) + __pow(dy, 2));
    const maxSpeed = MAX_SPEED / (1e3 / dt);
    let ax = maxSpeed * (dx / d) - this.vx;
    let ay = maxSpeed * (dy / d) - this.vy;
    const a = Math.sqrt(__pow(ax, 2) + __pow(ay, 2));
    const maxA = maxSpeed * ACCELERATION_TIME * dt;
    if (a > maxA) {
      ax *= maxA / a;
      ay *= maxA / a;
    }
    this.vx += ax;
    this.vy += ay;
    const v = Math.sqrt(__pow(this.vx, 2) + __pow(this.vy, 2));
    const maxV = 0.5 * (Math.sqrt(__pow(maxA, 2) + 8 * maxA * d) - maxA);
    if (v > maxV) {
      this.vx *= maxV / v;
      this.vy *= maxV / v;
    }
    this.x += this.vx;
    this.y += this.vy;
  }
}
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getAugmentedNamespace(n) {
  if (n.__esModule)
    return n;
  var f = n.default;
  if (typeof f == "function") {
    var a = function a2() {
      if (this instanceof a2) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else
    a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
var url = {};
var punycode$1 = { exports: {} };
/*! https://mths.be/punycode v1.4.1 by @mathias */
punycode$1.exports;
(function(module, exports) {
  (function(root) {
    var freeExports = exports && !exports.nodeType && exports;
    var freeModule = module && !module.nodeType && module;
    var freeGlobal = typeof commonjsGlobal == "object" && commonjsGlobal;
    if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal) {
      root = freeGlobal;
    }
    var punycode2, maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128, delimiter = "-", regexPunycode = /^xn--/, regexNonASCII = /[^\x20-\x7E]/, regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, errors = {
      "overflow": "Overflow: input needs wider integers to process",
      "not-basic": "Illegal input >= 0x80 (not a basic code point)",
      "invalid-input": "Invalid input"
    }, baseMinusTMin = base - tMin, floor = Math.floor, stringFromCharCode = String.fromCharCode, key;
    function error(type2) {
      throw new RangeError(errors[type2]);
    }
    function map(array, fn) {
      var length = array.length;
      var result = [];
      while (length--) {
        result[length] = fn(array[length]);
      }
      return result;
    }
    function mapDomain(string, fn) {
      var parts = string.split("@");
      var result = "";
      if (parts.length > 1) {
        result = parts[0] + "@";
        string = parts[1];
      }
      string = string.replace(regexSeparators, ".");
      var labels = string.split(".");
      var encoded = map(labels, fn).join(".");
      return result + encoded;
    }
    function ucs2decode(string) {
      var output = [], counter = 0, length = string.length, value, extra;
      while (counter < length) {
        value = string.charCodeAt(counter++);
        if (value >= 55296 && value <= 56319 && counter < length) {
          extra = string.charCodeAt(counter++);
          if ((extra & 64512) == 56320) {
            output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
          } else {
            output.push(value);
            counter--;
          }
        } else {
          output.push(value);
        }
      }
      return output;
    }
    function ucs2encode(array) {
      return map(array, function(value) {
        var output = "";
        if (value > 65535) {
          value -= 65536;
          output += stringFromCharCode(value >>> 10 & 1023 | 55296);
          value = 56320 | value & 1023;
        }
        output += stringFromCharCode(value);
        return output;
      }).join("");
    }
    function basicToDigit(codePoint) {
      if (codePoint - 48 < 10) {
        return codePoint - 22;
      }
      if (codePoint - 65 < 26) {
        return codePoint - 65;
      }
      if (codePoint - 97 < 26) {
        return codePoint - 97;
      }
      return base;
    }
    function digitToBasic(digit, flag) {
      return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
    }
    function adapt(delta, numPoints, firstTime) {
      var k = 0;
      delta = firstTime ? floor(delta / damp) : delta >> 1;
      delta += floor(delta / numPoints);
      for (; delta > baseMinusTMin * tMax >> 1; k += base) {
        delta = floor(delta / baseMinusTMin);
      }
      return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
    }
    function decode2(input) {
      var output = [], inputLength = input.length, out, i = 0, n = initialN, bias = initialBias, basic, j, index, oldi, w, k, digit, t, baseMinusT;
      basic = input.lastIndexOf(delimiter);
      if (basic < 0) {
        basic = 0;
      }
      for (j = 0; j < basic; ++j) {
        if (input.charCodeAt(j) >= 128) {
          error("not-basic");
        }
        output.push(input.charCodeAt(j));
      }
      for (index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
        for (oldi = i, w = 1, k = base; ; k += base) {
          if (index >= inputLength) {
            error("invalid-input");
          }
          digit = basicToDigit(input.charCodeAt(index++));
          if (digit >= base || digit > floor((maxInt - i) / w)) {
            error("overflow");
          }
          i += digit * w;
          t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
          if (digit < t) {
            break;
          }
          baseMinusT = base - t;
          if (w > floor(maxInt / baseMinusT)) {
            error("overflow");
          }
          w *= baseMinusT;
        }
        out = output.length + 1;
        bias = adapt(i - oldi, out, oldi == 0);
        if (floor(i / out) > maxInt - n) {
          error("overflow");
        }
        n += floor(i / out);
        i %= out;
        output.splice(i++, 0, n);
      }
      return ucs2encode(output);
    }
    function encode3(input) {
      var n, delta, handledCPCount, basicLength, bias, j, m, q, k, t, currentValue, output = [], inputLength, handledCPCountPlusOne, baseMinusT, qMinusT;
      input = ucs2decode(input);
      inputLength = input.length;
      n = initialN;
      delta = 0;
      bias = initialBias;
      for (j = 0; j < inputLength; ++j) {
        currentValue = input[j];
        if (currentValue < 128) {
          output.push(stringFromCharCode(currentValue));
        }
      }
      handledCPCount = basicLength = output.length;
      if (basicLength) {
        output.push(delimiter);
      }
      while (handledCPCount < inputLength) {
        for (m = maxInt, j = 0; j < inputLength; ++j) {
          currentValue = input[j];
          if (currentValue >= n && currentValue < m) {
            m = currentValue;
          }
        }
        handledCPCountPlusOne = handledCPCount + 1;
        if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
          error("overflow");
        }
        delta += (m - n) * handledCPCountPlusOne;
        n = m;
        for (j = 0; j < inputLength; ++j) {
          currentValue = input[j];
          if (currentValue < n && ++delta > maxInt) {
            error("overflow");
          }
          if (currentValue == n) {
            for (q = delta, k = base; ; k += base) {
              t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
              if (q < t) {
                break;
              }
              qMinusT = q - t;
              baseMinusT = base - t;
              output.push(
                stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
              );
              q = floor(qMinusT / baseMinusT);
            }
            output.push(stringFromCharCode(digitToBasic(q, 0)));
            bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
            delta = 0;
            ++handledCPCount;
          }
        }
        ++delta;
        ++n;
      }
      return output.join("");
    }
    function toUnicode(input) {
      return mapDomain(input, function(string) {
        return regexPunycode.test(string) ? decode2(string.slice(4).toLowerCase()) : string;
      });
    }
    function toASCII(input) {
      return mapDomain(input, function(string) {
        return regexNonASCII.test(string) ? "xn--" + encode3(string) : string;
      });
    }
    punycode2 = {
      /**
       * A string representing the current Punycode.js version number.
       * @memberOf punycode
       * @type String
       */
      "version": "1.4.1",
      /**
       * An object of methods to convert from JavaScript's internal character
       * representation (UCS-2) to Unicode code points, and back.
       * @see <https://mathiasbynens.be/notes/javascript-encoding>
       * @memberOf punycode
       * @type Object
       */
      "ucs2": {
        "decode": ucs2decode,
        "encode": ucs2encode
      },
      "decode": decode2,
      "encode": encode3,
      "toASCII": toASCII,
      "toUnicode": toUnicode
    };
    if (freeExports && freeModule) {
      if (module.exports == freeExports) {
        freeModule.exports = punycode2;
      } else {
        for (key in punycode2) {
          punycode2.hasOwnProperty(key) && (freeExports[key] = punycode2[key]);
        }
      }
    } else {
      root.punycode = punycode2;
    }
  })(commonjsGlobal);
})(punycode$1, punycode$1.exports);
var punycodeExports = punycode$1.exports;
var esErrors = Error;
var _eval = EvalError;
var range = RangeError;
var ref = ReferenceError;
var syntax = SyntaxError;
var type = TypeError;
var uri = URIError;
var shams = function hasSymbols() {
  if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
    return false;
  }
  if (typeof Symbol.iterator === "symbol") {
    return true;
  }
  var obj = {};
  var sym = Symbol("test");
  var symObj = Object(sym);
  if (typeof sym === "string") {
    return false;
  }
  if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
    return false;
  }
  if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
    return false;
  }
  var symVal = 42;
  obj[sym] = symVal;
  for (sym in obj) {
    return false;
  }
  if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
    return false;
  }
  if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
    return false;
  }
  var syms = Object.getOwnPropertySymbols(obj);
  if (syms.length !== 1 || syms[0] !== sym) {
    return false;
  }
  if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
    return false;
  }
  if (typeof Object.getOwnPropertyDescriptor === "function") {
    var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
    if (descriptor.value !== symVal || descriptor.enumerable !== true) {
      return false;
    }
  }
  return true;
};
var origSymbol = typeof Symbol !== "undefined" && Symbol;
var hasSymbolSham = shams;
var hasSymbols$1 = function hasNativeSymbols() {
  if (typeof origSymbol !== "function") {
    return false;
  }
  if (typeof Symbol !== "function") {
    return false;
  }
  if (typeof origSymbol("foo") !== "symbol") {
    return false;
  }
  if (typeof Symbol("bar") !== "symbol") {
    return false;
  }
  return hasSymbolSham();
};
var test = {
  __proto__: null,
  foo: {}
};
var $Object = Object;
var hasProto$1 = function hasProto() {
  return { __proto__: test }.foo === test.foo && !(test instanceof $Object);
};
var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
var toStr$1 = Object.prototype.toString;
var max = Math.max;
var funcType = "[object Function]";
var concatty = function concatty2(a, b) {
  var arr = [];
  for (var i = 0; i < a.length; i += 1) {
    arr[i] = a[i];
  }
  for (var j = 0; j < b.length; j += 1) {
    arr[j + a.length] = b[j];
  }
  return arr;
};
var slicy = function slicy2(arrLike, offset) {
  var arr = [];
  for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
    arr[j] = arrLike[i];
  }
  return arr;
};
var joiny = function(arr, joiner) {
  var str = "";
  for (var i = 0; i < arr.length; i += 1) {
    str += arr[i];
    if (i + 1 < arr.length) {
      str += joiner;
    }
  }
  return str;
};
var implementation$1 = function bind(that) {
  var target = this;
  if (typeof target !== "function" || toStr$1.apply(target) !== funcType) {
    throw new TypeError(ERROR_MESSAGE + target);
  }
  var args = slicy(arguments, 1);
  var bound;
  var binder = function() {
    if (this instanceof bound) {
      var result = target.apply(
        this,
        concatty(args, arguments)
      );
      if (Object(result) === result) {
        return result;
      }
      return this;
    }
    return target.apply(
      that,
      concatty(args, arguments)
    );
  };
  var boundLength = max(0, target.length - args.length);
  var boundArgs = [];
  for (var i = 0; i < boundLength; i++) {
    boundArgs[i] = "$" + i;
  }
  bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
  if (target.prototype) {
    var Empty = function Empty2() {
    };
    Empty.prototype = target.prototype;
    bound.prototype = new Empty();
    Empty.prototype = null;
  }
  return bound;
};
var implementation = implementation$1;
var functionBind = Function.prototype.bind || implementation;
var call = Function.prototype.call;
var $hasOwn = Object.prototype.hasOwnProperty;
var bind$1 = functionBind;
var hasown = bind$1.call(call, $hasOwn);
var undefined$1;
var $Error = esErrors;
var $EvalError = _eval;
var $RangeError = range;
var $ReferenceError = ref;
var $SyntaxError$1 = syntax;
var $TypeError$3 = type;
var $URIError = uri;
var $Function = Function;
var getEvalledConstructor = function(expressionSyntax) {
  try {
    return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
  } catch (e) {
  }
};
var $gOPD$1 = Object.getOwnPropertyDescriptor;
if ($gOPD$1) {
  try {
    $gOPD$1({}, "");
  } catch (e) {
    $gOPD$1 = null;
  }
}
var throwTypeError = function() {
  throw new $TypeError$3();
};
var ThrowTypeError = $gOPD$1 ? function() {
  try {
    arguments.callee;
    return throwTypeError;
  } catch (calleeThrows) {
    try {
      return $gOPD$1(arguments, "callee").get;
    } catch (gOPDthrows) {
      return throwTypeError;
    }
  }
}() : throwTypeError;
var hasSymbols2 = hasSymbols$1();
var hasProto2 = hasProto$1();
var getProto = Object.getPrototypeOf || (hasProto2 ? function(x) {
  return x.__proto__;
} : null);
var needsEval = {};
var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined$1 : getProto(Uint8Array);
var INTRINSICS = {
  __proto__: null,
  "%AggregateError%": typeof AggregateError === "undefined" ? undefined$1 : AggregateError,
  "%Array%": Array,
  "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined$1 : ArrayBuffer,
  "%ArrayIteratorPrototype%": hasSymbols2 && getProto ? getProto([][Symbol.iterator]()) : undefined$1,
  "%AsyncFromSyncIteratorPrototype%": undefined$1,
  "%AsyncFunction%": needsEval,
  "%AsyncGenerator%": needsEval,
  "%AsyncGeneratorFunction%": needsEval,
  "%AsyncIteratorPrototype%": needsEval,
  "%Atomics%": typeof Atomics === "undefined" ? undefined$1 : Atomics,
  "%BigInt%": typeof BigInt === "undefined" ? undefined$1 : BigInt,
  "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined$1 : BigInt64Array,
  "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined$1 : BigUint64Array,
  "%Boolean%": Boolean,
  "%DataView%": typeof DataView === "undefined" ? undefined$1 : DataView,
  "%Date%": Date,
  "%decodeURI%": decodeURI,
  "%decodeURIComponent%": decodeURIComponent,
  "%encodeURI%": encodeURI,
  "%encodeURIComponent%": encodeURIComponent,
  "%Error%": $Error,
  "%eval%": eval,
  // eslint-disable-line no-eval
  "%EvalError%": $EvalError,
  "%Float32Array%": typeof Float32Array === "undefined" ? undefined$1 : Float32Array,
  "%Float64Array%": typeof Float64Array === "undefined" ? undefined$1 : Float64Array,
  "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined$1 : FinalizationRegistry,
  "%Function%": $Function,
  "%GeneratorFunction%": needsEval,
  "%Int8Array%": typeof Int8Array === "undefined" ? undefined$1 : Int8Array,
  "%Int16Array%": typeof Int16Array === "undefined" ? undefined$1 : Int16Array,
  "%Int32Array%": typeof Int32Array === "undefined" ? undefined$1 : Int32Array,
  "%isFinite%": isFinite,
  "%isNaN%": isNaN,
  "%IteratorPrototype%": hasSymbols2 && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined$1,
  "%JSON%": typeof JSON === "object" ? JSON : undefined$1,
  "%Map%": typeof Map === "undefined" ? undefined$1 : Map,
  "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols2 || !getProto ? undefined$1 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
  "%Math%": Math,
  "%Number%": Number,
  "%Object%": Object,
  "%parseFloat%": parseFloat,
  "%parseInt%": parseInt,
  "%Promise%": typeof Promise === "undefined" ? undefined$1 : Promise,
  "%Proxy%": typeof Proxy === "undefined" ? undefined$1 : Proxy,
  "%RangeError%": $RangeError,
  "%ReferenceError%": $ReferenceError,
  "%Reflect%": typeof Reflect === "undefined" ? undefined$1 : Reflect,
  "%RegExp%": RegExp,
  "%Set%": typeof Set === "undefined" ? undefined$1 : Set,
  "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols2 || !getProto ? undefined$1 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
  "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined$1 : SharedArrayBuffer,
  "%String%": String,
  "%StringIteratorPrototype%": hasSymbols2 && getProto ? getProto(""[Symbol.iterator]()) : undefined$1,
  "%Symbol%": hasSymbols2 ? Symbol : undefined$1,
  "%SyntaxError%": $SyntaxError$1,
  "%ThrowTypeError%": ThrowTypeError,
  "%TypedArray%": TypedArray,
  "%TypeError%": $TypeError$3,
  "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined$1 : Uint8Array,
  "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined$1 : Uint8ClampedArray,
  "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined$1 : Uint16Array,
  "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined$1 : Uint32Array,
  "%URIError%": $URIError,
  "%WeakMap%": typeof WeakMap === "undefined" ? undefined$1 : WeakMap,
  "%WeakRef%": typeof WeakRef === "undefined" ? undefined$1 : WeakRef,
  "%WeakSet%": typeof WeakSet === "undefined" ? undefined$1 : WeakSet
};
if (getProto) {
  try {
    null.error;
  } catch (e) {
    var errorProto = getProto(getProto(e));
    INTRINSICS["%Error.prototype%"] = errorProto;
  }
}
var doEval = function doEval2(name) {
  var value;
  if (name === "%AsyncFunction%") {
    value = getEvalledConstructor("async function () {}");
  } else if (name === "%GeneratorFunction%") {
    value = getEvalledConstructor("function* () {}");
  } else if (name === "%AsyncGeneratorFunction%") {
    value = getEvalledConstructor("async function* () {}");
  } else if (name === "%AsyncGenerator%") {
    var fn = doEval2("%AsyncGeneratorFunction%");
    if (fn) {
      value = fn.prototype;
    }
  } else if (name === "%AsyncIteratorPrototype%") {
    var gen = doEval2("%AsyncGenerator%");
    if (gen && getProto) {
      value = getProto(gen.prototype);
    }
  }
  INTRINSICS[name] = value;
  return value;
};
var LEGACY_ALIASES = {
  __proto__: null,
  "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
  "%ArrayPrototype%": ["Array", "prototype"],
  "%ArrayProto_entries%": ["Array", "prototype", "entries"],
  "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
  "%ArrayProto_keys%": ["Array", "prototype", "keys"],
  "%ArrayProto_values%": ["Array", "prototype", "values"],
  "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
  "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
  "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
  "%BooleanPrototype%": ["Boolean", "prototype"],
  "%DataViewPrototype%": ["DataView", "prototype"],
  "%DatePrototype%": ["Date", "prototype"],
  "%ErrorPrototype%": ["Error", "prototype"],
  "%EvalErrorPrototype%": ["EvalError", "prototype"],
  "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
  "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
  "%FunctionPrototype%": ["Function", "prototype"],
  "%Generator%": ["GeneratorFunction", "prototype"],
  "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
  "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
  "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
  "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
  "%JSONParse%": ["JSON", "parse"],
  "%JSONStringify%": ["JSON", "stringify"],
  "%MapPrototype%": ["Map", "prototype"],
  "%NumberPrototype%": ["Number", "prototype"],
  "%ObjectPrototype%": ["Object", "prototype"],
  "%ObjProto_toString%": ["Object", "prototype", "toString"],
  "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
  "%PromisePrototype%": ["Promise", "prototype"],
  "%PromiseProto_then%": ["Promise", "prototype", "then"],
  "%Promise_all%": ["Promise", "all"],
  "%Promise_reject%": ["Promise", "reject"],
  "%Promise_resolve%": ["Promise", "resolve"],
  "%RangeErrorPrototype%": ["RangeError", "prototype"],
  "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
  "%RegExpPrototype%": ["RegExp", "prototype"],
  "%SetPrototype%": ["Set", "prototype"],
  "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
  "%StringPrototype%": ["String", "prototype"],
  "%SymbolPrototype%": ["Symbol", "prototype"],
  "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
  "%TypedArrayPrototype%": ["TypedArray", "prototype"],
  "%TypeErrorPrototype%": ["TypeError", "prototype"],
  "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
  "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
  "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
  "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
  "%URIErrorPrototype%": ["URIError", "prototype"],
  "%WeakMapPrototype%": ["WeakMap", "prototype"],
  "%WeakSetPrototype%": ["WeakSet", "prototype"]
};
var bind2 = functionBind;
var hasOwn$1 = hasown;
var $concat$1 = bind2.call(Function.call, Array.prototype.concat);
var $spliceApply = bind2.call(Function.apply, Array.prototype.splice);
var $replace$1 = bind2.call(Function.call, String.prototype.replace);
var $strSlice = bind2.call(Function.call, String.prototype.slice);
var $exec = bind2.call(Function.call, RegExp.prototype.exec);
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g;
var stringToPath = function stringToPath2(string) {
  var first = $strSlice(string, 0, 1);
  var last = $strSlice(string, -1);
  if (first === "%" && last !== "%") {
    throw new $SyntaxError$1("invalid intrinsic syntax, expected closing `%`");
  } else if (last === "%" && first !== "%") {
    throw new $SyntaxError$1("invalid intrinsic syntax, expected opening `%`");
  }
  var result = [];
  $replace$1(string, rePropName, function(match, number, quote2, subString) {
    result[result.length] = quote2 ? $replace$1(subString, reEscapeChar, "$1") : number || match;
  });
  return result;
};
var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
  var intrinsicName = name;
  var alias;
  if (hasOwn$1(LEGACY_ALIASES, intrinsicName)) {
    alias = LEGACY_ALIASES[intrinsicName];
    intrinsicName = "%" + alias[0] + "%";
  }
  if (hasOwn$1(INTRINSICS, intrinsicName)) {
    var value = INTRINSICS[intrinsicName];
    if (value === needsEval) {
      value = doEval(intrinsicName);
    }
    if (typeof value === "undefined" && !allowMissing) {
      throw new $TypeError$3("intrinsic " + name + " exists, but is not available. Please file an issue!");
    }
    return {
      alias,
      name: intrinsicName,
      value
    };
  }
  throw new $SyntaxError$1("intrinsic " + name + " does not exist!");
};
var getIntrinsic = function GetIntrinsic(name, allowMissing) {
  if (typeof name !== "string" || name.length === 0) {
    throw new $TypeError$3("intrinsic name must be a non-empty string");
  }
  if (arguments.length > 1 && typeof allowMissing !== "boolean") {
    throw new $TypeError$3('"allowMissing" argument must be a boolean');
  }
  if ($exec(/^%?[^%]*%?$/, name) === null) {
    throw new $SyntaxError$1("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
  }
  var parts = stringToPath(name);
  var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
  var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
  var intrinsicRealName = intrinsic.name;
  var value = intrinsic.value;
  var skipFurtherCaching = false;
  var alias = intrinsic.alias;
  if (alias) {
    intrinsicBaseName = alias[0];
    $spliceApply(parts, $concat$1([0, 1], alias));
  }
  for (var i = 1, isOwn = true; i < parts.length; i += 1) {
    var part = parts[i];
    var first = $strSlice(part, 0, 1);
    var last = $strSlice(part, -1);
    if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
      throw new $SyntaxError$1("property names with quotes must have matching quotes");
    }
    if (part === "constructor" || !isOwn) {
      skipFurtherCaching = true;
    }
    intrinsicBaseName += "." + part;
    intrinsicRealName = "%" + intrinsicBaseName + "%";
    if (hasOwn$1(INTRINSICS, intrinsicRealName)) {
      value = INTRINSICS[intrinsicRealName];
    } else if (value != null) {
      if (!(part in value)) {
        if (!allowMissing) {
          throw new $TypeError$3("base intrinsic for " + name + " exists, but the property is not available.");
        }
        return void 0;
      }
      if ($gOPD$1 && i + 1 >= parts.length) {
        var desc = $gOPD$1(value, part);
        isOwn = !!desc;
        if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
          value = desc.get;
        } else {
          value = value[part];
        }
      } else {
        isOwn = hasOwn$1(value, part);
        value = value[part];
      }
      if (isOwn && !skipFurtherCaching) {
        INTRINSICS[intrinsicRealName] = value;
      }
    }
  }
  return value;
};
var callBind$1 = { exports: {} };
var esDefineProperty;
var hasRequiredEsDefineProperty;
function requireEsDefineProperty() {
  if (hasRequiredEsDefineProperty)
    return esDefineProperty;
  hasRequiredEsDefineProperty = 1;
  var GetIntrinsic3 = getIntrinsic;
  var $defineProperty2 = GetIntrinsic3("%Object.defineProperty%", true) || false;
  if ($defineProperty2) {
    try {
      $defineProperty2({}, "a", { value: 1 });
    } catch (e) {
      $defineProperty2 = false;
    }
  }
  esDefineProperty = $defineProperty2;
  return esDefineProperty;
}
var GetIntrinsic$3 = getIntrinsic;
var $gOPD = GetIntrinsic$3("%Object.getOwnPropertyDescriptor%", true);
if ($gOPD) {
  try {
    $gOPD([], "length");
  } catch (e) {
    $gOPD = null;
  }
}
var gopd$1 = $gOPD;
var $defineProperty$1 = requireEsDefineProperty();
var $SyntaxError = syntax;
var $TypeError$2 = type;
var gopd = gopd$1;
var defineDataProperty = function defineDataProperty2(obj, property, value) {
  if (!obj || typeof obj !== "object" && typeof obj !== "function") {
    throw new $TypeError$2("`obj` must be an object or a function`");
  }
  if (typeof property !== "string" && typeof property !== "symbol") {
    throw new $TypeError$2("`property` must be a string or a symbol`");
  }
  if (arguments.length > 3 && typeof arguments[3] !== "boolean" && arguments[3] !== null) {
    throw new $TypeError$2("`nonEnumerable`, if provided, must be a boolean or null");
  }
  if (arguments.length > 4 && typeof arguments[4] !== "boolean" && arguments[4] !== null) {
    throw new $TypeError$2("`nonWritable`, if provided, must be a boolean or null");
  }
  if (arguments.length > 5 && typeof arguments[5] !== "boolean" && arguments[5] !== null) {
    throw new $TypeError$2("`nonConfigurable`, if provided, must be a boolean or null");
  }
  if (arguments.length > 6 && typeof arguments[6] !== "boolean") {
    throw new $TypeError$2("`loose`, if provided, must be a boolean");
  }
  var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
  var nonWritable = arguments.length > 4 ? arguments[4] : null;
  var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
  var loose = arguments.length > 6 ? arguments[6] : false;
  var desc = !!gopd && gopd(obj, property);
  if ($defineProperty$1) {
    $defineProperty$1(obj, property, {
      configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
      enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
      value,
      writable: nonWritable === null && desc ? desc.writable : !nonWritable
    });
  } else if (loose || !nonEnumerable && !nonWritable && !nonConfigurable) {
    obj[property] = value;
  } else {
    throw new $SyntaxError("This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.");
  }
};
var $defineProperty = requireEsDefineProperty();
var hasPropertyDescriptors = function hasPropertyDescriptors2() {
  return !!$defineProperty;
};
hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
  if (!$defineProperty) {
    return null;
  }
  try {
    return $defineProperty([], "length", { value: 1 }).length !== 1;
  } catch (e) {
    return true;
  }
};
var hasPropertyDescriptors_1 = hasPropertyDescriptors;
var GetIntrinsic$2 = getIntrinsic;
var define = defineDataProperty;
var hasDescriptors = hasPropertyDescriptors_1();
var gOPD = gopd$1;
var $TypeError$1 = type;
var $floor$1 = GetIntrinsic$2("%Math.floor%");
var setFunctionLength = function setFunctionLength2(fn, length) {
  if (typeof fn !== "function") {
    throw new $TypeError$1("`fn` is not a function");
  }
  if (typeof length !== "number" || length < 0 || length > 4294967295 || $floor$1(length) !== length) {
    throw new $TypeError$1("`length` must be a positive 32-bit integer");
  }
  var loose = arguments.length > 2 && !!arguments[2];
  var functionLengthIsConfigurable = true;
  var functionLengthIsWritable = true;
  if ("length" in fn && gOPD) {
    var desc = gOPD(fn, "length");
    if (desc && !desc.configurable) {
      functionLengthIsConfigurable = false;
    }
    if (desc && !desc.writable) {
      functionLengthIsWritable = false;
    }
  }
  if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
    if (hasDescriptors) {
      define(
        /** @type {Parameters<define>[0]} */
        fn,
        "length",
        length,
        true,
        true
      );
    } else {
      define(
        /** @type {Parameters<define>[0]} */
        fn,
        "length",
        length
      );
    }
  }
  return fn;
};
(function(module) {
  var bind3 = functionBind;
  var GetIntrinsic3 = getIntrinsic;
  var setFunctionLength$1 = setFunctionLength;
  var $TypeError2 = type;
  var $apply = GetIntrinsic3("%Function.prototype.apply%");
  var $call = GetIntrinsic3("%Function.prototype.call%");
  var $reflectApply = GetIntrinsic3("%Reflect.apply%", true) || bind3.call($call, $apply);
  var $defineProperty2 = requireEsDefineProperty();
  var $max = GetIntrinsic3("%Math.max%");
  module.exports = function callBind2(originalFunction) {
    if (typeof originalFunction !== "function") {
      throw new $TypeError2("a function is required");
    }
    var func = $reflectApply(bind3, $call, arguments);
    return setFunctionLength$1(
      func,
      1 + $max(0, originalFunction.length - (arguments.length - 1)),
      true
    );
  };
  var applyBind = function applyBind2() {
    return $reflectApply(bind3, $apply, arguments);
  };
  if ($defineProperty2) {
    $defineProperty2(module.exports, "apply", { value: applyBind });
  } else {
    module.exports.apply = applyBind;
  }
})(callBind$1);
var callBindExports = callBind$1.exports;
var GetIntrinsic$1 = getIntrinsic;
var callBind = callBindExports;
var $indexOf = callBind(GetIntrinsic$1("String.prototype.indexOf"));
var callBound$1 = function callBoundIntrinsic(name, allowMissing) {
  var intrinsic = GetIntrinsic$1(name, !!allowMissing);
  if (typeof intrinsic === "function" && $indexOf(name, ".prototype.") > -1) {
    return callBind(intrinsic);
  }
  return intrinsic;
};
const __viteBrowserExternal = {};
const __viteBrowserExternal$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: __viteBrowserExternal
}, Symbol.toStringTag, { value: "Module" }));
const require$$0 = /* @__PURE__ */ getAugmentedNamespace(__viteBrowserExternal$1);
var hasMap = typeof Map === "function" && Map.prototype;
var mapSizeDescriptor = Object.getOwnPropertyDescriptor && hasMap ? Object.getOwnPropertyDescriptor(Map.prototype, "size") : null;
var mapSize = hasMap && mapSizeDescriptor && typeof mapSizeDescriptor.get === "function" ? mapSizeDescriptor.get : null;
var mapForEach = hasMap && Map.prototype.forEach;
var hasSet = typeof Set === "function" && Set.prototype;
var setSizeDescriptor = Object.getOwnPropertyDescriptor && hasSet ? Object.getOwnPropertyDescriptor(Set.prototype, "size") : null;
var setSize = hasSet && setSizeDescriptor && typeof setSizeDescriptor.get === "function" ? setSizeDescriptor.get : null;
var setForEach = hasSet && Set.prototype.forEach;
var hasWeakMap = typeof WeakMap === "function" && WeakMap.prototype;
var weakMapHas = hasWeakMap ? WeakMap.prototype.has : null;
var hasWeakSet = typeof WeakSet === "function" && WeakSet.prototype;
var weakSetHas = hasWeakSet ? WeakSet.prototype.has : null;
var hasWeakRef = typeof WeakRef === "function" && WeakRef.prototype;
var weakRefDeref = hasWeakRef ? WeakRef.prototype.deref : null;
var booleanValueOf = Boolean.prototype.valueOf;
var objectToString = Object.prototype.toString;
var functionToString = Function.prototype.toString;
var $match = String.prototype.match;
var $slice = String.prototype.slice;
var $replace = String.prototype.replace;
var $toUpperCase = String.prototype.toUpperCase;
var $toLowerCase = String.prototype.toLowerCase;
var $test = RegExp.prototype.test;
var $concat = Array.prototype.concat;
var $join = Array.prototype.join;
var $arrSlice = Array.prototype.slice;
var $floor = Math.floor;
var bigIntValueOf = typeof BigInt === "function" ? BigInt.prototype.valueOf : null;
var gOPS = Object.getOwnPropertySymbols;
var symToString = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? Symbol.prototype.toString : null;
var hasShammedSymbols = typeof Symbol === "function" && typeof Symbol.iterator === "object";
var toStringTag = typeof Symbol === "function" && Symbol.toStringTag && (typeof Symbol.toStringTag === hasShammedSymbols ? "object" : "symbol") ? Symbol.toStringTag : null;
var isEnumerable = Object.prototype.propertyIsEnumerable;
var gPO = (typeof Reflect === "function" ? Reflect.getPrototypeOf : Object.getPrototypeOf) || ([].__proto__ === Array.prototype ? function(O) {
  return O.__proto__;
} : null);
function addNumericSeparator(num, str) {
  if (num === Infinity || num === -Infinity || num !== num || num && num > -1e3 && num < 1e3 || $test.call(/e/, str)) {
    return str;
  }
  var sepRegex = /[0-9](?=(?:[0-9]{3})+(?![0-9]))/g;
  if (typeof num === "number") {
    var int = num < 0 ? -$floor(-num) : $floor(num);
    if (int !== num) {
      var intStr = String(int);
      var dec = $slice.call(str, intStr.length + 1);
      return $replace.call(intStr, sepRegex, "$&_") + "." + $replace.call($replace.call(dec, /([0-9]{3})/g, "$&_"), /_$/, "");
    }
  }
  return $replace.call(str, sepRegex, "$&_");
}
var utilInspect = require$$0;
var inspectCustom = utilInspect.custom;
var inspectSymbol = isSymbol(inspectCustom) ? inspectCustom : null;
var objectInspect = function inspect_(obj, options, depth, seen) {
  var opts = options || {};
  if (has$3(opts, "quoteStyle") && (opts.quoteStyle !== "single" && opts.quoteStyle !== "double")) {
    throw new TypeError('option "quoteStyle" must be "single" or "double"');
  }
  if (has$3(opts, "maxStringLength") && (typeof opts.maxStringLength === "number" ? opts.maxStringLength < 0 && opts.maxStringLength !== Infinity : opts.maxStringLength !== null)) {
    throw new TypeError('option "maxStringLength", if provided, must be a positive integer, Infinity, or `null`');
  }
  var customInspect = has$3(opts, "customInspect") ? opts.customInspect : true;
  if (typeof customInspect !== "boolean" && customInspect !== "symbol") {
    throw new TypeError("option \"customInspect\", if provided, must be `true`, `false`, or `'symbol'`");
  }
  if (has$3(opts, "indent") && opts.indent !== null && opts.indent !== "	" && !(parseInt(opts.indent, 10) === opts.indent && opts.indent > 0)) {
    throw new TypeError('option "indent" must be "\\t", an integer > 0, or `null`');
  }
  if (has$3(opts, "numericSeparator") && typeof opts.numericSeparator !== "boolean") {
    throw new TypeError('option "numericSeparator", if provided, must be `true` or `false`');
  }
  var numericSeparator = opts.numericSeparator;
  if (typeof obj === "undefined") {
    return "undefined";
  }
  if (obj === null) {
    return "null";
  }
  if (typeof obj === "boolean") {
    return obj ? "true" : "false";
  }
  if (typeof obj === "string") {
    return inspectString(obj, opts);
  }
  if (typeof obj === "number") {
    if (obj === 0) {
      return Infinity / obj > 0 ? "0" : "-0";
    }
    var str = String(obj);
    return numericSeparator ? addNumericSeparator(obj, str) : str;
  }
  if (typeof obj === "bigint") {
    var bigIntStr = String(obj) + "n";
    return numericSeparator ? addNumericSeparator(obj, bigIntStr) : bigIntStr;
  }
  var maxDepth = typeof opts.depth === "undefined" ? 5 : opts.depth;
  if (typeof depth === "undefined") {
    depth = 0;
  }
  if (depth >= maxDepth && maxDepth > 0 && typeof obj === "object") {
    return isArray$3(obj) ? "[Array]" : "[Object]";
  }
  var indent = getIndent(opts, depth);
  if (typeof seen === "undefined") {
    seen = [];
  } else if (indexOf(seen, obj) >= 0) {
    return "[Circular]";
  }
  function inspect2(value, from, noIndent) {
    if (from) {
      seen = $arrSlice.call(seen);
      seen.push(from);
    }
    if (noIndent) {
      var newOpts = {
        depth: opts.depth
      };
      if (has$3(opts, "quoteStyle")) {
        newOpts.quoteStyle = opts.quoteStyle;
      }
      return inspect_(value, newOpts, depth + 1, seen);
    }
    return inspect_(value, opts, depth + 1, seen);
  }
  if (typeof obj === "function" && !isRegExp$1(obj)) {
    var name = nameOf(obj);
    var keys = arrObjKeys(obj, inspect2);
    return "[Function" + (name ? ": " + name : " (anonymous)") + "]" + (keys.length > 0 ? " { " + $join.call(keys, ", ") + " }" : "");
  }
  if (isSymbol(obj)) {
    var symString = hasShammedSymbols ? $replace.call(String(obj), /^(Symbol\(.*\))_[^)]*$/, "$1") : symToString.call(obj);
    return typeof obj === "object" && !hasShammedSymbols ? markBoxed(symString) : symString;
  }
  if (isElement(obj)) {
    var s = "<" + $toLowerCase.call(String(obj.nodeName));
    var attrs = obj.attributes || [];
    for (var i = 0; i < attrs.length; i++) {
      s += " " + attrs[i].name + "=" + wrapQuotes(quote(attrs[i].value), "double", opts);
    }
    s += ">";
    if (obj.childNodes && obj.childNodes.length) {
      s += "...";
    }
    s += "</" + $toLowerCase.call(String(obj.nodeName)) + ">";
    return s;
  }
  if (isArray$3(obj)) {
    if (obj.length === 0) {
      return "[]";
    }
    var xs = arrObjKeys(obj, inspect2);
    if (indent && !singleLineValues(xs)) {
      return "[" + indentedJoin(xs, indent) + "]";
    }
    return "[ " + $join.call(xs, ", ") + " ]";
  }
  if (isError(obj)) {
    var parts = arrObjKeys(obj, inspect2);
    if (!("cause" in Error.prototype) && "cause" in obj && !isEnumerable.call(obj, "cause")) {
      return "{ [" + String(obj) + "] " + $join.call($concat.call("[cause]: " + inspect2(obj.cause), parts), ", ") + " }";
    }
    if (parts.length === 0) {
      return "[" + String(obj) + "]";
    }
    return "{ [" + String(obj) + "] " + $join.call(parts, ", ") + " }";
  }
  if (typeof obj === "object" && customInspect) {
    if (inspectSymbol && typeof obj[inspectSymbol] === "function" && utilInspect) {
      return utilInspect(obj, { depth: maxDepth - depth });
    } else if (customInspect !== "symbol" && typeof obj.inspect === "function") {
      return obj.inspect();
    }
  }
  if (isMap(obj)) {
    var mapParts = [];
    if (mapForEach) {
      mapForEach.call(obj, function(value, key) {
        mapParts.push(inspect2(key, obj, true) + " => " + inspect2(value, obj));
      });
    }
    return collectionOf("Map", mapSize.call(obj), mapParts, indent);
  }
  if (isSet(obj)) {
    var setParts = [];
    if (setForEach) {
      setForEach.call(obj, function(value) {
        setParts.push(inspect2(value, obj));
      });
    }
    return collectionOf("Set", setSize.call(obj), setParts, indent);
  }
  if (isWeakMap(obj)) {
    return weakCollectionOf("WeakMap");
  }
  if (isWeakSet(obj)) {
    return weakCollectionOf("WeakSet");
  }
  if (isWeakRef(obj)) {
    return weakCollectionOf("WeakRef");
  }
  if (isNumber(obj)) {
    return markBoxed(inspect2(Number(obj)));
  }
  if (isBigInt(obj)) {
    return markBoxed(inspect2(bigIntValueOf.call(obj)));
  }
  if (isBoolean(obj)) {
    return markBoxed(booleanValueOf.call(obj));
  }
  if (isString(obj)) {
    return markBoxed(inspect2(String(obj)));
  }
  if (typeof window !== "undefined" && obj === window) {
    return "{ [object Window] }";
  }
  if (obj === commonjsGlobal) {
    return "{ [object globalThis] }";
  }
  if (!isDate(obj) && !isRegExp$1(obj)) {
    var ys = arrObjKeys(obj, inspect2);
    var isPlainObject = gPO ? gPO(obj) === Object.prototype : obj instanceof Object || obj.constructor === Object;
    var protoTag = obj instanceof Object ? "" : "null prototype";
    var stringTag = !isPlainObject && toStringTag && Object(obj) === obj && toStringTag in obj ? $slice.call(toStr(obj), 8, -1) : protoTag ? "Object" : "";
    var constructorTag = isPlainObject || typeof obj.constructor !== "function" ? "" : obj.constructor.name ? obj.constructor.name + " " : "";
    var tag = constructorTag + (stringTag || protoTag ? "[" + $join.call($concat.call([], stringTag || [], protoTag || []), ": ") + "] " : "");
    if (ys.length === 0) {
      return tag + "{}";
    }
    if (indent) {
      return tag + "{" + indentedJoin(ys, indent) + "}";
    }
    return tag + "{ " + $join.call(ys, ", ") + " }";
  }
  return String(obj);
};
function wrapQuotes(s, defaultStyle, opts) {
  var quoteChar = (opts.quoteStyle || defaultStyle) === "double" ? '"' : "'";
  return quoteChar + s + quoteChar;
}
function quote(s) {
  return $replace.call(String(s), /"/g, "&quot;");
}
function isArray$3(obj) {
  return toStr(obj) === "[object Array]" && (!toStringTag || !(typeof obj === "object" && toStringTag in obj));
}
function isDate(obj) {
  return toStr(obj) === "[object Date]" && (!toStringTag || !(typeof obj === "object" && toStringTag in obj));
}
function isRegExp$1(obj) {
  return toStr(obj) === "[object RegExp]" && (!toStringTag || !(typeof obj === "object" && toStringTag in obj));
}
function isError(obj) {
  return toStr(obj) === "[object Error]" && (!toStringTag || !(typeof obj === "object" && toStringTag in obj));
}
function isString(obj) {
  return toStr(obj) === "[object String]" && (!toStringTag || !(typeof obj === "object" && toStringTag in obj));
}
function isNumber(obj) {
  return toStr(obj) === "[object Number]" && (!toStringTag || !(typeof obj === "object" && toStringTag in obj));
}
function isBoolean(obj) {
  return toStr(obj) === "[object Boolean]" && (!toStringTag || !(typeof obj === "object" && toStringTag in obj));
}
function isSymbol(obj) {
  if (hasShammedSymbols) {
    return obj && typeof obj === "object" && obj instanceof Symbol;
  }
  if (typeof obj === "symbol") {
    return true;
  }
  if (!obj || typeof obj !== "object" || !symToString) {
    return false;
  }
  try {
    symToString.call(obj);
    return true;
  } catch (e) {
  }
  return false;
}
function isBigInt(obj) {
  if (!obj || typeof obj !== "object" || !bigIntValueOf) {
    return false;
  }
  try {
    bigIntValueOf.call(obj);
    return true;
  } catch (e) {
  }
  return false;
}
var hasOwn = Object.prototype.hasOwnProperty || function(key) {
  return key in this;
};
function has$3(obj, key) {
  return hasOwn.call(obj, key);
}
function toStr(obj) {
  return objectToString.call(obj);
}
function nameOf(f) {
  if (f.name) {
    return f.name;
  }
  var m = $match.call(functionToString.call(f), /^function\s*([\w$]+)/);
  if (m) {
    return m[1];
  }
  return null;
}
function indexOf(xs, x) {
  if (xs.indexOf) {
    return xs.indexOf(x);
  }
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) {
      return i;
    }
  }
  return -1;
}
function isMap(x) {
  if (!mapSize || !x || typeof x !== "object") {
    return false;
  }
  try {
    mapSize.call(x);
    try {
      setSize.call(x);
    } catch (s) {
      return true;
    }
    return x instanceof Map;
  } catch (e) {
  }
  return false;
}
function isWeakMap(x) {
  if (!weakMapHas || !x || typeof x !== "object") {
    return false;
  }
  try {
    weakMapHas.call(x, weakMapHas);
    try {
      weakSetHas.call(x, weakSetHas);
    } catch (s) {
      return true;
    }
    return x instanceof WeakMap;
  } catch (e) {
  }
  return false;
}
function isWeakRef(x) {
  if (!weakRefDeref || !x || typeof x !== "object") {
    return false;
  }
  try {
    weakRefDeref.call(x);
    return true;
  } catch (e) {
  }
  return false;
}
function isSet(x) {
  if (!setSize || !x || typeof x !== "object") {
    return false;
  }
  try {
    setSize.call(x);
    try {
      mapSize.call(x);
    } catch (m) {
      return true;
    }
    return x instanceof Set;
  } catch (e) {
  }
  return false;
}
function isWeakSet(x) {
  if (!weakSetHas || !x || typeof x !== "object") {
    return false;
  }
  try {
    weakSetHas.call(x, weakSetHas);
    try {
      weakMapHas.call(x, weakMapHas);
    } catch (s) {
      return true;
    }
    return x instanceof WeakSet;
  } catch (e) {
  }
  return false;
}
function isElement(x) {
  if (!x || typeof x !== "object") {
    return false;
  }
  if (typeof HTMLElement !== "undefined" && x instanceof HTMLElement) {
    return true;
  }
  return typeof x.nodeName === "string" && typeof x.getAttribute === "function";
}
function inspectString(str, opts) {
  if (str.length > opts.maxStringLength) {
    var remaining = str.length - opts.maxStringLength;
    var trailer = "... " + remaining + " more character" + (remaining > 1 ? "s" : "");
    return inspectString($slice.call(str, 0, opts.maxStringLength), opts) + trailer;
  }
  var s = $replace.call($replace.call(str, /(['\\])/g, "\\$1"), /[\x00-\x1f]/g, lowbyte);
  return wrapQuotes(s, "single", opts);
}
function lowbyte(c) {
  var n = c.charCodeAt(0);
  var x = {
    8: "b",
    9: "t",
    10: "n",
    12: "f",
    13: "r"
  }[n];
  if (x) {
    return "\\" + x;
  }
  return "\\x" + (n < 16 ? "0" : "") + $toUpperCase.call(n.toString(16));
}
function markBoxed(str) {
  return "Object(" + str + ")";
}
function weakCollectionOf(type2) {
  return type2 + " { ? }";
}
function collectionOf(type2, size, entries, indent) {
  var joinedEntries = indent ? indentedJoin(entries, indent) : $join.call(entries, ", ");
  return type2 + " (" + size + ") {" + joinedEntries + "}";
}
function singleLineValues(xs) {
  for (var i = 0; i < xs.length; i++) {
    if (indexOf(xs[i], "\n") >= 0) {
      return false;
    }
  }
  return true;
}
function getIndent(opts, depth) {
  var baseIndent;
  if (opts.indent === "	") {
    baseIndent = "	";
  } else if (typeof opts.indent === "number" && opts.indent > 0) {
    baseIndent = $join.call(Array(opts.indent + 1), " ");
  } else {
    return null;
  }
  return {
    base: baseIndent,
    prev: $join.call(Array(depth + 1), baseIndent)
  };
}
function indentedJoin(xs, indent) {
  if (xs.length === 0) {
    return "";
  }
  var lineJoiner = "\n" + indent.prev + indent.base;
  return lineJoiner + $join.call(xs, "," + lineJoiner) + "\n" + indent.prev;
}
function arrObjKeys(obj, inspect2) {
  var isArr = isArray$3(obj);
  var xs = [];
  if (isArr) {
    xs.length = obj.length;
    for (var i = 0; i < obj.length; i++) {
      xs[i] = has$3(obj, i) ? inspect2(obj[i], obj) : "";
    }
  }
  var syms = typeof gOPS === "function" ? gOPS(obj) : [];
  var symMap;
  if (hasShammedSymbols) {
    symMap = {};
    for (var k = 0; k < syms.length; k++) {
      symMap["$" + syms[k]] = syms[k];
    }
  }
  for (var key in obj) {
    if (!has$3(obj, key)) {
      continue;
    }
    if (isArr && String(Number(key)) === key && key < obj.length) {
      continue;
    }
    if (hasShammedSymbols && symMap["$" + key] instanceof Symbol) {
      continue;
    } else if ($test.call(/[^\w$]/, key)) {
      xs.push(inspect2(key, obj) + ": " + inspect2(obj[key], obj));
    } else {
      xs.push(key + ": " + inspect2(obj[key], obj));
    }
  }
  if (typeof gOPS === "function") {
    for (var j = 0; j < syms.length; j++) {
      if (isEnumerable.call(obj, syms[j])) {
        xs.push("[" + inspect2(syms[j]) + "]: " + inspect2(obj[syms[j]], obj));
      }
    }
  }
  return xs;
}
var GetIntrinsic2 = getIntrinsic;
var callBound = callBound$1;
var inspect = objectInspect;
var $TypeError = type;
var $WeakMap = GetIntrinsic2("%WeakMap%", true);
var $Map = GetIntrinsic2("%Map%", true);
var $weakMapGet = callBound("WeakMap.prototype.get", true);
var $weakMapSet = callBound("WeakMap.prototype.set", true);
var $weakMapHas = callBound("WeakMap.prototype.has", true);
var $mapGet = callBound("Map.prototype.get", true);
var $mapSet = callBound("Map.prototype.set", true);
var $mapHas = callBound("Map.prototype.has", true);
var listGetNode = function(list, key) {
  var prev = list;
  var curr;
  for (; (curr = prev.next) !== null; prev = curr) {
    if (curr.key === key) {
      prev.next = curr.next;
      curr.next = /** @type {NonNullable<typeof list.next>} */
      list.next;
      list.next = curr;
      return curr;
    }
  }
};
var listGet = function(objects, key) {
  var node = listGetNode(objects, key);
  return node && node.value;
};
var listSet = function(objects, key, value) {
  var node = listGetNode(objects, key);
  if (node) {
    node.value = value;
  } else {
    objects.next = /** @type {import('.').ListNode<typeof value>} */
    {
      // eslint-disable-line no-param-reassign, no-extra-parens
      key,
      next: objects.next,
      value
    };
  }
};
var listHas = function(objects, key) {
  return !!listGetNode(objects, key);
};
var sideChannel = function getSideChannel() {
  var $wm;
  var $m;
  var $o;
  var channel = {
    assert: function(key) {
      if (!channel.has(key)) {
        throw new $TypeError("Side channel does not contain " + inspect(key));
      }
    },
    get: function(key) {
      if ($WeakMap && key && (typeof key === "object" || typeof key === "function")) {
        if ($wm) {
          return $weakMapGet($wm, key);
        }
      } else if ($Map) {
        if ($m) {
          return $mapGet($m, key);
        }
      } else {
        if ($o) {
          return listGet($o, key);
        }
      }
    },
    has: function(key) {
      if ($WeakMap && key && (typeof key === "object" || typeof key === "function")) {
        if ($wm) {
          return $weakMapHas($wm, key);
        }
      } else if ($Map) {
        if ($m) {
          return $mapHas($m, key);
        }
      } else {
        if ($o) {
          return listHas($o, key);
        }
      }
      return false;
    },
    set: function(key, value) {
      if ($WeakMap && key && (typeof key === "object" || typeof key === "function")) {
        if (!$wm) {
          $wm = new $WeakMap();
        }
        $weakMapSet($wm, key, value);
      } else if ($Map) {
        if (!$m) {
          $m = new $Map();
        }
        $mapSet($m, key, value);
      } else {
        if (!$o) {
          $o = { key: {}, next: null };
        }
        listSet($o, key, value);
      }
    }
  };
  return channel;
};
var replace = String.prototype.replace;
var percentTwenties = /%20/g;
var Format = {
  RFC1738: "RFC1738",
  RFC3986: "RFC3986"
};
var formats$3 = {
  "default": Format.RFC3986,
  formatters: {
    RFC1738: function(value) {
      return replace.call(value, percentTwenties, "+");
    },
    RFC3986: function(value) {
      return String(value);
    }
  },
  RFC1738: Format.RFC1738,
  RFC3986: Format.RFC3986
};
var formats$2 = formats$3;
var has$2 = Object.prototype.hasOwnProperty;
var isArray$2 = Array.isArray;
var hexTable = function() {
  var array = [];
  for (var i = 0; i < 256; ++i) {
    array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
  }
  return array;
}();
var compactQueue = function compactQueue2(queue) {
  while (queue.length > 1) {
    var item = queue.pop();
    var obj = item.obj[item.prop];
    if (isArray$2(obj)) {
      var compacted = [];
      for (var j = 0; j < obj.length; ++j) {
        if (typeof obj[j] !== "undefined") {
          compacted.push(obj[j]);
        }
      }
      item.obj[item.prop] = compacted;
    }
  }
};
var arrayToObject = function arrayToObject2(source, options) {
  var obj = options && options.plainObjects ? /* @__PURE__ */ Object.create(null) : {};
  for (var i = 0; i < source.length; ++i) {
    if (typeof source[i] !== "undefined") {
      obj[i] = source[i];
    }
  }
  return obj;
};
var merge = function merge2(target, source, options) {
  if (!source) {
    return target;
  }
  if (typeof source !== "object") {
    if (isArray$2(target)) {
      target.push(source);
    } else if (target && typeof target === "object") {
      if (options && (options.plainObjects || options.allowPrototypes) || !has$2.call(Object.prototype, source)) {
        target[source] = true;
      }
    } else {
      return [target, source];
    }
    return target;
  }
  if (!target || typeof target !== "object") {
    return [target].concat(source);
  }
  var mergeTarget = target;
  if (isArray$2(target) && !isArray$2(source)) {
    mergeTarget = arrayToObject(target, options);
  }
  if (isArray$2(target) && isArray$2(source)) {
    source.forEach(function(item, i) {
      if (has$2.call(target, i)) {
        var targetItem = target[i];
        if (targetItem && typeof targetItem === "object" && item && typeof item === "object") {
          target[i] = merge2(targetItem, item, options);
        } else {
          target.push(item);
        }
      } else {
        target[i] = item;
      }
    });
    return target;
  }
  return Object.keys(source).reduce(function(acc, key) {
    var value = source[key];
    if (has$2.call(acc, key)) {
      acc[key] = merge2(acc[key], value, options);
    } else {
      acc[key] = value;
    }
    return acc;
  }, mergeTarget);
};
var assign = function assignSingleSource(target, source) {
  return Object.keys(source).reduce(function(acc, key) {
    acc[key] = source[key];
    return acc;
  }, target);
};
var decode = function(str, decoder, charset) {
  var strWithoutPlus = str.replace(/\+/g, " ");
  if (charset === "iso-8859-1") {
    return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
  }
  try {
    return decodeURIComponent(strWithoutPlus);
  } catch (e) {
    return strWithoutPlus;
  }
};
var limit = 1024;
var encode = function encode2(str, defaultEncoder, charset, kind, format) {
  if (str.length === 0) {
    return str;
  }
  var string = str;
  if (typeof str === "symbol") {
    string = Symbol.prototype.toString.call(str);
  } else if (typeof str !== "string") {
    string = String(str);
  }
  if (charset === "iso-8859-1") {
    return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
      return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
    });
  }
  var out = "";
  for (var j = 0; j < string.length; j += limit) {
    var segment = string.length >= limit ? string.slice(j, j + limit) : string;
    var arr = [];
    for (var i = 0; i < segment.length; ++i) {
      var c = segment.charCodeAt(i);
      if (c === 45 || c === 46 || c === 95 || c === 126 || c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122 || format === formats$2.RFC1738 && (c === 40 || c === 41)) {
        arr[arr.length] = segment.charAt(i);
        continue;
      }
      if (c < 128) {
        arr[arr.length] = hexTable[c];
        continue;
      }
      if (c < 2048) {
        arr[arr.length] = hexTable[192 | c >> 6] + hexTable[128 | c & 63];
        continue;
      }
      if (c < 55296 || c >= 57344) {
        arr[arr.length] = hexTable[224 | c >> 12] + hexTable[128 | c >> 6 & 63] + hexTable[128 | c & 63];
        continue;
      }
      i += 1;
      c = 65536 + ((c & 1023) << 10 | segment.charCodeAt(i) & 1023);
      arr[arr.length] = hexTable[240 | c >> 18] + hexTable[128 | c >> 12 & 63] + hexTable[128 | c >> 6 & 63] + hexTable[128 | c & 63];
    }
    out += arr.join("");
  }
  return out;
};
var compact = function compact2(value) {
  var queue = [{ obj: { o: value }, prop: "o" }];
  var refs = [];
  for (var i = 0; i < queue.length; ++i) {
    var item = queue[i];
    var obj = item.obj[item.prop];
    var keys = Object.keys(obj);
    for (var j = 0; j < keys.length; ++j) {
      var key = keys[j];
      var val = obj[key];
      if (typeof val === "object" && val !== null && refs.indexOf(val) === -1) {
        queue.push({ obj, prop: key });
        refs.push(val);
      }
    }
  }
  compactQueue(queue);
  return value;
};
var isRegExp = function isRegExp2(obj) {
  return Object.prototype.toString.call(obj) === "[object RegExp]";
};
var isBuffer = function isBuffer2(obj) {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
};
var combine = function combine2(a, b) {
  return [].concat(a, b);
};
var maybeMap = function maybeMap2(val, fn) {
  if (isArray$2(val)) {
    var mapped = [];
    for (var i = 0; i < val.length; i += 1) {
      mapped.push(fn(val[i]));
    }
    return mapped;
  }
  return fn(val);
};
var utils$2 = {
  arrayToObject,
  assign,
  combine,
  compact,
  decode,
  encode,
  isBuffer,
  isRegExp,
  maybeMap,
  merge
};
var getSideChannel2 = sideChannel;
var utils$1 = utils$2;
var formats$1 = formats$3;
var has$1 = Object.prototype.hasOwnProperty;
var arrayPrefixGenerators = {
  brackets: function brackets(prefix) {
    return prefix + "[]";
  },
  comma: "comma",
  indices: function indices(prefix, key) {
    return prefix + "[" + key + "]";
  },
  repeat: function repeat(prefix) {
    return prefix;
  }
};
var isArray$1 = Array.isArray;
var push = Array.prototype.push;
var pushToArray = function(arr, valueOrArray) {
  push.apply(arr, isArray$1(valueOrArray) ? valueOrArray : [valueOrArray]);
};
var toISO = Date.prototype.toISOString;
var defaultFormat = formats$1["default"];
var defaults$1 = {
  addQueryPrefix: false,
  allowDots: false,
  allowEmptyArrays: false,
  arrayFormat: "indices",
  charset: "utf-8",
  charsetSentinel: false,
  delimiter: "&",
  encode: true,
  encodeDotInKeys: false,
  encoder: utils$1.encode,
  encodeValuesOnly: false,
  format: defaultFormat,
  formatter: formats$1.formatters[defaultFormat],
  // deprecated
  indices: false,
  serializeDate: function serializeDate(date) {
    return toISO.call(date);
  },
  skipNulls: false,
  strictNullHandling: false
};
var isNonNullishPrimitive = function isNonNullishPrimitive2(v) {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || typeof v === "symbol" || typeof v === "bigint";
};
var sentinel = {};
var stringify$1 = function stringify(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate2, format, formatter, encodeValuesOnly, charset, sideChannel2) {
  var obj = object;
  var tmpSc = sideChannel2;
  var step = 0;
  var findFlag = false;
  while ((tmpSc = tmpSc.get(sentinel)) !== void 0 && !findFlag) {
    var pos = tmpSc.get(object);
    step += 1;
    if (typeof pos !== "undefined") {
      if (pos === step) {
        throw new RangeError("Cyclic object value");
      } else {
        findFlag = true;
      }
    }
    if (typeof tmpSc.get(sentinel) === "undefined") {
      step = 0;
    }
  }
  if (typeof filter === "function") {
    obj = filter(prefix, obj);
  } else if (obj instanceof Date) {
    obj = serializeDate2(obj);
  } else if (generateArrayPrefix === "comma" && isArray$1(obj)) {
    obj = utils$1.maybeMap(obj, function(value2) {
      if (value2 instanceof Date) {
        return serializeDate2(value2);
      }
      return value2;
    });
  }
  if (obj === null) {
    if (strictNullHandling) {
      return encoder && !encodeValuesOnly ? encoder(prefix, defaults$1.encoder, charset, "key", format) : prefix;
    }
    obj = "";
  }
  if (isNonNullishPrimitive(obj) || utils$1.isBuffer(obj)) {
    if (encoder) {
      var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults$1.encoder, charset, "key", format);
      return [formatter(keyValue) + "=" + formatter(encoder(obj, defaults$1.encoder, charset, "value", format))];
    }
    return [formatter(prefix) + "=" + formatter(String(obj))];
  }
  var values = [];
  if (typeof obj === "undefined") {
    return values;
  }
  var objKeys;
  if (generateArrayPrefix === "comma" && isArray$1(obj)) {
    if (encodeValuesOnly && encoder) {
      obj = utils$1.maybeMap(obj, encoder);
    }
    objKeys = [{ value: obj.length > 0 ? obj.join(",") || null : void 0 }];
  } else if (isArray$1(filter)) {
    objKeys = filter;
  } else {
    var keys = Object.keys(obj);
    objKeys = sort ? keys.sort(sort) : keys;
  }
  var encodedPrefix = encodeDotInKeys ? prefix.replace(/\./g, "%2E") : prefix;
  var adjustedPrefix = commaRoundTrip && isArray$1(obj) && obj.length === 1 ? encodedPrefix + "[]" : encodedPrefix;
  if (allowEmptyArrays && isArray$1(obj) && obj.length === 0) {
    return adjustedPrefix + "[]";
  }
  for (var j = 0; j < objKeys.length; ++j) {
    var key = objKeys[j];
    var value = typeof key === "object" && typeof key.value !== "undefined" ? key.value : obj[key];
    if (skipNulls && value === null) {
      continue;
    }
    var encodedKey = allowDots && encodeDotInKeys ? key.replace(/\./g, "%2E") : key;
    var keyPrefix = isArray$1(obj) ? typeof generateArrayPrefix === "function" ? generateArrayPrefix(adjustedPrefix, encodedKey) : adjustedPrefix : adjustedPrefix + (allowDots ? "." + encodedKey : "[" + encodedKey + "]");
    sideChannel2.set(object, step);
    var valueSideChannel = getSideChannel2();
    valueSideChannel.set(sentinel, sideChannel2);
    pushToArray(values, stringify(
      value,
      keyPrefix,
      generateArrayPrefix,
      commaRoundTrip,
      allowEmptyArrays,
      strictNullHandling,
      skipNulls,
      encodeDotInKeys,
      generateArrayPrefix === "comma" && encodeValuesOnly && isArray$1(obj) ? null : encoder,
      filter,
      sort,
      allowDots,
      serializeDate2,
      format,
      formatter,
      encodeValuesOnly,
      charset,
      valueSideChannel
    ));
  }
  return values;
};
var normalizeStringifyOptions = function normalizeStringifyOptions2(opts) {
  if (!opts) {
    return defaults$1;
  }
  if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") {
    throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  }
  if (typeof opts.encodeDotInKeys !== "undefined" && typeof opts.encodeDotInKeys !== "boolean") {
    throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
  }
  if (opts.encoder !== null && typeof opts.encoder !== "undefined" && typeof opts.encoder !== "function") {
    throw new TypeError("Encoder has to be a function.");
  }
  var charset = opts.charset || defaults$1.charset;
  if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") {
    throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  }
  var format = formats$1["default"];
  if (typeof opts.format !== "undefined") {
    if (!has$1.call(formats$1.formatters, opts.format)) {
      throw new TypeError("Unknown format option provided.");
    }
    format = opts.format;
  }
  var formatter = formats$1.formatters[format];
  var filter = defaults$1.filter;
  if (typeof opts.filter === "function" || isArray$1(opts.filter)) {
    filter = opts.filter;
  }
  var arrayFormat;
  if (opts.arrayFormat in arrayPrefixGenerators) {
    arrayFormat = opts.arrayFormat;
  } else if ("indices" in opts) {
    arrayFormat = opts.indices ? "indices" : "repeat";
  } else {
    arrayFormat = defaults$1.arrayFormat;
  }
  if ("commaRoundTrip" in opts && typeof opts.commaRoundTrip !== "boolean") {
    throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
  }
  var allowDots = typeof opts.allowDots === "undefined" ? opts.encodeDotInKeys === true ? true : defaults$1.allowDots : !!opts.allowDots;
  return {
    addQueryPrefix: typeof opts.addQueryPrefix === "boolean" ? opts.addQueryPrefix : defaults$1.addQueryPrefix,
    allowDots,
    allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults$1.allowEmptyArrays,
    arrayFormat,
    charset,
    charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults$1.charsetSentinel,
    commaRoundTrip: opts.commaRoundTrip,
    delimiter: typeof opts.delimiter === "undefined" ? defaults$1.delimiter : opts.delimiter,
    encode: typeof opts.encode === "boolean" ? opts.encode : defaults$1.encode,
    encodeDotInKeys: typeof opts.encodeDotInKeys === "boolean" ? opts.encodeDotInKeys : defaults$1.encodeDotInKeys,
    encoder: typeof opts.encoder === "function" ? opts.encoder : defaults$1.encoder,
    encodeValuesOnly: typeof opts.encodeValuesOnly === "boolean" ? opts.encodeValuesOnly : defaults$1.encodeValuesOnly,
    filter,
    format,
    formatter,
    serializeDate: typeof opts.serializeDate === "function" ? opts.serializeDate : defaults$1.serializeDate,
    skipNulls: typeof opts.skipNulls === "boolean" ? opts.skipNulls : defaults$1.skipNulls,
    sort: typeof opts.sort === "function" ? opts.sort : null,
    strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults$1.strictNullHandling
  };
};
var stringify_1 = function(object, opts) {
  var obj = object;
  var options = normalizeStringifyOptions(opts);
  var objKeys;
  var filter;
  if (typeof options.filter === "function") {
    filter = options.filter;
    obj = filter("", obj);
  } else if (isArray$1(options.filter)) {
    filter = options.filter;
    objKeys = filter;
  }
  var keys = [];
  if (typeof obj !== "object" || obj === null) {
    return "";
  }
  var generateArrayPrefix = arrayPrefixGenerators[options.arrayFormat];
  var commaRoundTrip = generateArrayPrefix === "comma" && options.commaRoundTrip;
  if (!objKeys) {
    objKeys = Object.keys(obj);
  }
  if (options.sort) {
    objKeys.sort(options.sort);
  }
  var sideChannel2 = getSideChannel2();
  for (var i = 0; i < objKeys.length; ++i) {
    var key = objKeys[i];
    if (options.skipNulls && obj[key] === null) {
      continue;
    }
    pushToArray(keys, stringify$1(
      obj[key],
      key,
      generateArrayPrefix,
      commaRoundTrip,
      options.allowEmptyArrays,
      options.strictNullHandling,
      options.skipNulls,
      options.encodeDotInKeys,
      options.encode ? options.encoder : null,
      options.filter,
      options.sort,
      options.allowDots,
      options.serializeDate,
      options.format,
      options.formatter,
      options.encodeValuesOnly,
      options.charset,
      sideChannel2
    ));
  }
  var joined = keys.join(options.delimiter);
  var prefix = options.addQueryPrefix === true ? "?" : "";
  if (options.charsetSentinel) {
    if (options.charset === "iso-8859-1") {
      prefix += "utf8=%26%2310003%3B&";
    } else {
      prefix += "utf8=%E2%9C%93&";
    }
  }
  return joined.length > 0 ? prefix + joined : "";
};
var utils = utils$2;
var has = Object.prototype.hasOwnProperty;
var isArray = Array.isArray;
var defaults = {
  allowDots: false,
  allowEmptyArrays: false,
  allowPrototypes: false,
  allowSparse: false,
  arrayLimit: 20,
  charset: "utf-8",
  charsetSentinel: false,
  comma: false,
  decodeDotInKeys: false,
  decoder: utils.decode,
  delimiter: "&",
  depth: 5,
  duplicates: "combine",
  ignoreQueryPrefix: false,
  interpretNumericEntities: false,
  parameterLimit: 1e3,
  parseArrays: true,
  plainObjects: false,
  strictNullHandling: false
};
var interpretNumericEntities = function(str) {
  return str.replace(/&#(\d+);/g, function($0, numberStr) {
    return String.fromCharCode(parseInt(numberStr, 10));
  });
};
var parseArrayValue = function(val, options) {
  if (val && typeof val === "string" && options.comma && val.indexOf(",") > -1) {
    return val.split(",");
  }
  return val;
};
var isoSentinel = "utf8=%26%2310003%3B";
var charsetSentinel = "utf8=%E2%9C%93";
var parseValues = function parseQueryStringValues(str, options) {
  var obj = { __proto__: null };
  var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, "") : str;
  var limit2 = options.parameterLimit === Infinity ? void 0 : options.parameterLimit;
  var parts = cleanStr.split(options.delimiter, limit2);
  var skipIndex = -1;
  var i;
  var charset = options.charset;
  if (options.charsetSentinel) {
    for (i = 0; i < parts.length; ++i) {
      if (parts[i].indexOf("utf8=") === 0) {
        if (parts[i] === charsetSentinel) {
          charset = "utf-8";
        } else if (parts[i] === isoSentinel) {
          charset = "iso-8859-1";
        }
        skipIndex = i;
        i = parts.length;
      }
    }
  }
  for (i = 0; i < parts.length; ++i) {
    if (i === skipIndex) {
      continue;
    }
    var part = parts[i];
    var bracketEqualsPos = part.indexOf("]=");
    var pos = bracketEqualsPos === -1 ? part.indexOf("=") : bracketEqualsPos + 1;
    var key, val;
    if (pos === -1) {
      key = options.decoder(part, defaults.decoder, charset, "key");
      val = options.strictNullHandling ? null : "";
    } else {
      key = options.decoder(part.slice(0, pos), defaults.decoder, charset, "key");
      val = utils.maybeMap(
        parseArrayValue(part.slice(pos + 1), options),
        function(encodedVal) {
          return options.decoder(encodedVal, defaults.decoder, charset, "value");
        }
      );
    }
    if (val && options.interpretNumericEntities && charset === "iso-8859-1") {
      val = interpretNumericEntities(val);
    }
    if (part.indexOf("[]=") > -1) {
      val = isArray(val) ? [val] : val;
    }
    var existing = has.call(obj, key);
    if (existing && options.duplicates === "combine") {
      obj[key] = utils.combine(obj[key], val);
    } else if (!existing || options.duplicates === "last") {
      obj[key] = val;
    }
  }
  return obj;
};
var parseObject = function(chain, val, options, valuesParsed) {
  var leaf = valuesParsed ? val : parseArrayValue(val, options);
  for (var i = chain.length - 1; i >= 0; --i) {
    var obj;
    var root = chain[i];
    if (root === "[]" && options.parseArrays) {
      obj = options.allowEmptyArrays && leaf === "" ? [] : [].concat(leaf);
    } else {
      obj = options.plainObjects ? /* @__PURE__ */ Object.create(null) : {};
      var cleanRoot = root.charAt(0) === "[" && root.charAt(root.length - 1) === "]" ? root.slice(1, -1) : root;
      var decodedRoot = options.decodeDotInKeys ? cleanRoot.replace(/%2E/g, ".") : cleanRoot;
      var index = parseInt(decodedRoot, 10);
      if (!options.parseArrays && decodedRoot === "") {
        obj = { 0: leaf };
      } else if (!isNaN(index) && root !== decodedRoot && String(index) === decodedRoot && index >= 0 && (options.parseArrays && index <= options.arrayLimit)) {
        obj = [];
        obj[index] = leaf;
      } else if (decodedRoot !== "__proto__") {
        obj[decodedRoot] = leaf;
      }
    }
    leaf = obj;
  }
  return leaf;
};
var parseKeys = function parseQueryStringKeys(givenKey, val, options, valuesParsed) {
  if (!givenKey) {
    return;
  }
  var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, "[$1]") : givenKey;
  var brackets2 = /(\[[^[\]]*])/;
  var child = /(\[[^[\]]*])/g;
  var segment = options.depth > 0 && brackets2.exec(key);
  var parent = segment ? key.slice(0, segment.index) : key;
  var keys = [];
  if (parent) {
    if (!options.plainObjects && has.call(Object.prototype, parent)) {
      if (!options.allowPrototypes) {
        return;
      }
    }
    keys.push(parent);
  }
  var i = 0;
  while (options.depth > 0 && (segment = child.exec(key)) !== null && i < options.depth) {
    i += 1;
    if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
      if (!options.allowPrototypes) {
        return;
      }
    }
    keys.push(segment[1]);
  }
  if (segment) {
    keys.push("[" + key.slice(segment.index) + "]");
  }
  return parseObject(keys, val, options, valuesParsed);
};
var normalizeParseOptions = function normalizeParseOptions2(opts) {
  if (!opts) {
    return defaults;
  }
  if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") {
    throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  }
  if (typeof opts.decodeDotInKeys !== "undefined" && typeof opts.decodeDotInKeys !== "boolean") {
    throw new TypeError("`decodeDotInKeys` option can only be `true` or `false`, when provided");
  }
  if (opts.decoder !== null && typeof opts.decoder !== "undefined" && typeof opts.decoder !== "function") {
    throw new TypeError("Decoder has to be a function.");
  }
  if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") {
    throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  }
  var charset = typeof opts.charset === "undefined" ? defaults.charset : opts.charset;
  var duplicates = typeof opts.duplicates === "undefined" ? defaults.duplicates : opts.duplicates;
  if (duplicates !== "combine" && duplicates !== "first" && duplicates !== "last") {
    throw new TypeError("The duplicates option must be either combine, first, or last");
  }
  var allowDots = typeof opts.allowDots === "undefined" ? opts.decodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;
  return {
    allowDots,
    allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
    allowPrototypes: typeof opts.allowPrototypes === "boolean" ? opts.allowPrototypes : defaults.allowPrototypes,
    allowSparse: typeof opts.allowSparse === "boolean" ? opts.allowSparse : defaults.allowSparse,
    arrayLimit: typeof opts.arrayLimit === "number" ? opts.arrayLimit : defaults.arrayLimit,
    charset,
    charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults.charsetSentinel,
    comma: typeof opts.comma === "boolean" ? opts.comma : defaults.comma,
    decodeDotInKeys: typeof opts.decodeDotInKeys === "boolean" ? opts.decodeDotInKeys : defaults.decodeDotInKeys,
    decoder: typeof opts.decoder === "function" ? opts.decoder : defaults.decoder,
    delimiter: typeof opts.delimiter === "string" || utils.isRegExp(opts.delimiter) ? opts.delimiter : defaults.delimiter,
    // eslint-disable-next-line no-implicit-coercion, no-extra-parens
    depth: typeof opts.depth === "number" || opts.depth === false ? +opts.depth : defaults.depth,
    duplicates,
    ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
    interpretNumericEntities: typeof opts.interpretNumericEntities === "boolean" ? opts.interpretNumericEntities : defaults.interpretNumericEntities,
    parameterLimit: typeof opts.parameterLimit === "number" ? opts.parameterLimit : defaults.parameterLimit,
    parseArrays: opts.parseArrays !== false,
    plainObjects: typeof opts.plainObjects === "boolean" ? opts.plainObjects : defaults.plainObjects,
    strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults.strictNullHandling
  };
};
var parse$1 = function(str, opts) {
  var options = normalizeParseOptions(opts);
  if (str === "" || str === null || typeof str === "undefined") {
    return options.plainObjects ? /* @__PURE__ */ Object.create(null) : {};
  }
  var tempObj = typeof str === "string" ? parseValues(str, options) : str;
  var obj = options.plainObjects ? /* @__PURE__ */ Object.create(null) : {};
  var keys = Object.keys(tempObj);
  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];
    var newObj = parseKeys(key, tempObj[key], options, typeof str === "string");
    obj = utils.merge(obj, newObj, options);
  }
  if (options.allowSparse === true) {
    return obj;
  }
  return utils.compact(obj);
};
var stringify2 = stringify_1;
var parse = parse$1;
var formats = formats$3;
var lib = {
  formats,
  parse,
  stringify: stringify2
};
var punycode = punycodeExports;
function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}
var protocolPattern = /^([a-z0-9.+-]+:)/i, portPattern = /:[0-9]*$/, simplePathPattern = /^(\/\/?(?!\/)[^?\s]*)(\?[^\s]*)?$/, delims = [
  "<",
  ">",
  '"',
  "`",
  " ",
  "\r",
  "\n",
  "	"
], unwise = [
  "{",
  "}",
  "|",
  "\\",
  "^",
  "`"
].concat(delims), autoEscape = ["'"].concat(unwise), nonHostChars = [
  "%",
  "/",
  "?",
  ";",
  "#"
].concat(autoEscape), hostEndingChars = [
  "/",
  "?",
  "#"
], hostnameMaxLen = 255, hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/, hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/, unsafeProtocol = {
  javascript: true,
  "javascript:": true
}, hostlessProtocol = {
  javascript: true,
  "javascript:": true
}, slashedProtocol = {
  http: true,
  https: true,
  ftp: true,
  gopher: true,
  file: true,
  "http:": true,
  "https:": true,
  "ftp:": true,
  "gopher:": true,
  "file:": true
}, querystring = lib;
function urlParse(url2, parseQueryString, slashesDenoteHost) {
  if (url2 && typeof url2 === "object" && url2 instanceof Url) {
    return url2;
  }
  var u = new Url();
  u.parse(url2, parseQueryString, slashesDenoteHost);
  return u;
}
Url.prototype.parse = function(url2, parseQueryString, slashesDenoteHost) {
  if (typeof url2 !== "string") {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url2);
  }
  var queryIndex = url2.indexOf("?"), splitter = queryIndex !== -1 && queryIndex < url2.indexOf("#") ? "?" : "#", uSplit = url2.split(splitter), slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, "/");
  url2 = uSplit.join(splitter);
  var rest = url2;
  rest = rest.trim();
  if (!slashesDenoteHost && url2.split("#").length === 1) {
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = "";
        this.query = {};
      }
      return this;
    }
  }
  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@/]+@[^@/]+/)) {
    var slashes = rest.substr(0, 2) === "//";
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }
  if (!hostlessProtocol[proto] && (slashes || proto && !slashedProtocol[proto])) {
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) {
        hostEnd = hec;
      }
    }
    var auth, atSign;
    if (hostEnd === -1) {
      atSign = rest.lastIndexOf("@");
    } else {
      atSign = rest.lastIndexOf("@", hostEnd);
    }
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) {
        hostEnd = hec;
      }
    }
    if (hostEnd === -1) {
      hostEnd = rest.length;
    }
    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);
    this.parseHost();
    this.hostname = this.hostname || "";
    var ipv6Hostname = this.hostname[0] === "[" && this.hostname[this.hostname.length - 1] === "]";
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) {
          continue;
        }
        if (!part.match(hostnamePartPattern)) {
          var newpart = "";
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              newpart += "x";
            } else {
              newpart += part[j];
            }
          }
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = "/" + notHost.join(".") + rest;
            }
            this.hostname = validParts.join(".");
            break;
          }
        }
      }
    }
    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = "";
    } else {
      this.hostname = this.hostname.toLowerCase();
    }
    if (!ipv6Hostname) {
      this.hostname = punycode.toASCII(this.hostname);
    }
    var p = this.port ? ":" + this.port : "";
    var h = this.hostname || "";
    this.host = h + p;
    this.href += this.host;
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== "/") {
        rest = "/" + rest;
      }
    }
  }
  if (!unsafeProtocol[lowerProto]) {
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1) {
        continue;
      }
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }
  var hash = rest.indexOf("#");
  if (hash !== -1) {
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf("?");
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    this.search = "";
    this.query = {};
  }
  if (rest) {
    this.pathname = rest;
  }
  if (slashedProtocol[lowerProto] && this.hostname && !this.pathname) {
    this.pathname = "/";
  }
  if (this.pathname || this.search) {
    var p = this.pathname || "";
    var s = this.search || "";
    this.path = p + s;
  }
  this.href = this.format();
  return this;
};
function urlFormat(obj) {
  if (typeof obj === "string") {
    obj = urlParse(obj);
  }
  if (!(obj instanceof Url)) {
    return Url.prototype.format.call(obj);
  }
  return obj.format();
}
Url.prototype.format = function() {
  var auth = this.auth || "";
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ":");
    auth += "@";
  }
  var protocol = this.protocol || "", pathname = this.pathname || "", hash = this.hash || "", host = false, query = "";
  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(":") === -1 ? this.hostname : "[" + this.hostname + "]");
    if (this.port) {
      host += ":" + this.port;
    }
  }
  if (this.query && typeof this.query === "object" && Object.keys(this.query).length) {
    query = querystring.stringify(this.query, {
      arrayFormat: "repeat",
      addQueryPrefix: false
    });
  }
  var search = this.search || query && "?" + query || "";
  if (protocol && protocol.substr(-1) !== ":") {
    protocol += ":";
  }
  if (this.slashes || (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = "//" + (host || "");
    if (pathname && pathname.charAt(0) !== "/") {
      pathname = "/" + pathname;
    }
  } else if (!host) {
    host = "";
  }
  if (hash && hash.charAt(0) !== "#") {
    hash = "#" + hash;
  }
  if (search && search.charAt(0) !== "?") {
    search = "?" + search;
  }
  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace("#", "%23");
  return protocol + host + pathname + search + hash;
};
function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}
Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};
function urlResolveObject(source, relative) {
  if (!source) {
    return relative;
  }
  return urlParse(source, false, true).resolveObject(relative);
}
Url.prototype.resolveObject = function(relative) {
  if (typeof relative === "string") {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }
  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }
  result.hash = relative.hash;
  if (relative.href === "") {
    result.href = result.format();
    return result;
  }
  if (relative.slashes && !relative.protocol) {
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== "protocol") {
        result[rkey] = relative[rkey];
      }
    }
    if (slashedProtocol[result.protocol] && result.hostname && !result.pathname) {
      result.pathname = "/";
      result.path = result.pathname;
    }
    result.href = result.format();
    return result;
  }
  if (relative.protocol && relative.protocol !== result.protocol) {
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }
    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || "").split("/");
      while (relPath.length && !(relative.host = relPath.shift())) {
      }
      if (!relative.host) {
        relative.host = "";
      }
      if (!relative.hostname) {
        relative.hostname = "";
      }
      if (relPath[0] !== "") {
        relPath.unshift("");
      }
      if (relPath.length < 2) {
        relPath.unshift("");
      }
      result.pathname = relPath.join("/");
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || "";
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    if (result.pathname || result.search) {
      var p = result.pathname || "";
      var s = result.search || "";
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }
  var isSourceAbs = result.pathname && result.pathname.charAt(0) === "/", isRelAbs = relative.host || relative.pathname && relative.pathname.charAt(0) === "/", mustEndAbs = isRelAbs || isSourceAbs || result.host && relative.pathname, removeAllDots = mustEndAbs, srcPath = result.pathname && result.pathname.split("/") || [], relPath = relative.pathname && relative.pathname.split("/") || [], psychotic = result.protocol && !slashedProtocol[result.protocol];
  if (psychotic) {
    result.hostname = "";
    result.port = null;
    if (result.host) {
      if (srcPath[0] === "") {
        srcPath[0] = result.host;
      } else {
        srcPath.unshift(result.host);
      }
    }
    result.host = "";
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === "") {
          relPath[0] = relative.host;
        } else {
          relPath.unshift(relative.host);
        }
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === "" || srcPath[0] === "");
  }
  if (isRelAbs) {
    result.host = relative.host || relative.host === "" ? relative.host : result.host;
    result.hostname = relative.hostname || relative.hostname === "" ? relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
  } else if (relPath.length) {
    if (!srcPath) {
      srcPath = [];
    }
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (relative.search != null) {
    if (psychotic) {
      result.host = srcPath.shift();
      result.hostname = result.host;
      var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.hostname = authInHost.shift();
        result.host = result.hostname;
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    if (result.pathname !== null || result.search !== null) {
      result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
    }
    result.href = result.format();
    return result;
  }
  if (!srcPath.length) {
    result.pathname = null;
    if (result.search) {
      result.path = "/" + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (result.host || relative.host || srcPath.length > 1) && (last === "." || last === "..") || last === "";
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === ".") {
      srcPath.splice(i, 1);
    } else if (last === "..") {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift("..");
    }
  }
  if (mustEndAbs && srcPath[0] !== "" && (!srcPath[0] || srcPath[0].charAt(0) !== "/")) {
    srcPath.unshift("");
  }
  if (hasTrailingSlash && srcPath.join("/").substr(-1) !== "/") {
    srcPath.push("");
  }
  var isAbsolute = srcPath[0] === "" || srcPath[0] && srcPath[0].charAt(0) === "/";
  if (psychotic) {
    result.hostname = isAbsolute ? "" : srcPath.length ? srcPath.shift() : "";
    result.host = result.hostname;
    var authInHost = result.host && result.host.indexOf("@") > 0 ? result.host.split("@") : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.hostname = authInHost.shift();
      result.host = result.hostname;
    }
  }
  mustEndAbs = mustEndAbs || result.host && srcPath.length;
  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift("");
  }
  if (srcPath.length > 0) {
    result.pathname = srcPath.join("/");
  } else {
    result.pathname = null;
    result.path = null;
  }
  if (result.pathname !== null || result.search !== null) {
    result.path = (result.pathname ? result.pathname : "") + (result.search ? result.search : "");
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};
Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ":") {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) {
    this.hostname = host;
  }
};
url.parse = urlParse;
url.resolve = urlResolve;
url.resolveObject = urlResolveObject;
url.format = urlFormat;
url.Url = Url;
class ModelSettings {
  /**
   * @param json - The settings JSON object.
   * @param json.url - The `url` field must be defined to specify the settings file's URL.
   */
  constructor(json) {
    __publicField(this, "json");
    /**
     * The model's name, typically used for displaying or logging. By default it's inferred from
     * the URL by taking the folder name (the second to last component). In Cubism 2 it'll be overwritten
     * by the `name` field of settings JSON.
     */
    __publicField(this, "name");
    /**
     * URL of the model settings file, used to resolve paths of the resource files defined in settings.
     * This typically ends with `.model.json` in Cubism 2 and `.model3.json` in Cubism 4.
     */
    __publicField(this, "url");
    /**
     * Relative path of the pose file.
     */
    __publicField(this, "pose");
    /**
     * Relative path of the physics file.
     */
    __publicField(this, "physics");
    this.json = json;
    const url2 = json.url;
    if (typeof url2 !== "string") {
      throw new TypeError("The `url` field in settings JSON must be defined as a string.");
    }
    this.url = url2;
    this.name = folderName(this.url);
  }
  /**
   * Resolves a relative path using the {@link url}. This is used to resolve the resource files
   * defined in the settings.
   * @param path - Relative path.
   * @return Resolved path.
   */
  resolveURL(path) {
    return url.resolve(this.url, path);
  }
  /**
   * Replaces the resource files by running each file through the `replacer`.
   * @param replacer - Invoked with two arguments: `(file, path)`, where `file` is the file definition,
   * and `path` is its property path in the ModelSettings instance. A string must be returned to be the replacement.
   *
   * ```js
   * modelSettings.replaceFiles((file, path) => {
   *     // file = "foo.moc", path = "moc"
   *     // file = "foo.png", path = "textures[0]"
   *     // file = "foo.mtn", path = "motions.idle[0].file"
   *     // file = "foo.motion3.json", path = "motions.idle[0].File"
   *
   *     return "bar/" + file;
   * });
   * ```
   */
  replaceFiles(replacer) {
    this.moc = replacer(this.moc, "moc");
    if (this.pose !== void 0) {
      this.pose = replacer(this.pose, "pose");
    }
    if (this.physics !== void 0) {
      this.physics = replacer(this.physics, "physics");
    }
    for (let i = 0; i < this.textures.length; i++) {
      this.textures[i] = replacer(this.textures[i], `textures[${i}]`);
    }
  }
  /**
   * Retrieves all resource files defined in the settings.
   * @return A flat array of the paths of all resource files.
   *
   * ```js
   * modelSettings.getDefinedFiles();
   * // returns: ["foo.moc", "foo.png", ...]
   * ```
   */
  getDefinedFiles() {
    const files = [];
    this.replaceFiles((file) => {
      files.push(file);
      return file;
    });
    return files;
  }
  /**
   * Validates that the files defined in the settings exist in given files. Each file will be
   * resolved by {@link resolveURL} before comparison.
   * @param files - A flat array of file paths.
   * @return All the files which are defined in the settings and also exist in given files,
   * *including the optional files*.
   * @throws Error if any *essential* file is defined in settings but not included in given files.
   */
  validateFiles(files) {
    const assertFileExists = (expectedFile, shouldThrow) => {
      const actualPath = this.resolveURL(expectedFile);
      if (!files.includes(actualPath)) {
        if (shouldThrow) {
          throw new Error(
            `File "${expectedFile}" is defined in settings, but doesn't exist in given files`
          );
        }
        return false;
      }
      return true;
    };
    const essentialFiles = [this.moc, ...this.textures];
    essentialFiles.forEach((texture) => assertFileExists(texture, true));
    const definedFiles = this.getDefinedFiles();
    return definedFiles.filter((file) => assertFileExists(file, false));
  }
}
var MotionPriority = /* @__PURE__ */ ((MotionPriority2) => {
  MotionPriority2[MotionPriority2["NONE"] = 0] = "NONE";
  MotionPriority2[MotionPriority2["IDLE"] = 1] = "IDLE";
  MotionPriority2[MotionPriority2["NORMAL"] = 2] = "NORMAL";
  MotionPriority2[MotionPriority2["FORCE"] = 3] = "FORCE";
  return MotionPriority2;
})(MotionPriority || {});
class MotionState {
  constructor() {
    /**
     * Tag for logging.
     */
    __publicField(this, "tag");
    /**
     * When enabled, the states will be dumped to the logger when an exception occurs.
     */
    __publicField(this, "debug", false);
    /**
     * Priority of the current motion. Will be `MotionPriority.NONE` if there's no playing motion.
     */
    __publicField(this, "currentPriority", 0);
    /**
     * Priority of the reserved motion, which is still in loading and will be played once loaded.
     * Will be `MotionPriority.NONE` if there's no reserved motion.
     */
    __publicField(this, "reservePriority", 0);
    /**
     * Group of current motion.
     */
    __publicField(this, "currentGroup");
    /**
     * Index of current motion in its group.
     */
    __publicField(this, "currentIndex");
    /**
     * Group of the reserved motion.
     */
    __publicField(this, "reservedGroup");
    /**
     * Index of the reserved motion in its group.
     */
    __publicField(this, "reservedIndex");
    /**
     * Group of the reserved idle motion.
     */
    __publicField(this, "reservedIdleGroup");
    /**
     * Index of the reserved idle motion in its group.
     */
    __publicField(this, "reservedIdleIndex");
  }
  /**
   * Reserves the playback for a motion.
   * @param group - The motion group.
   * @param index - Index in the motion group.
   * @param priority - The priority to be applied.
   * @return True if the reserving has succeeded.
   */
  reserve(group, index, priority) {
    if (priority <= 0) {
      logger.log(this.tag, `Cannot start a motion with MotionPriority.NONE.`);
      return false;
    }
    if (group === this.currentGroup && index === this.currentIndex) {
      logger.log(this.tag, `Motion is already playing.`, this.dump(group, index));
      return false;
    }
    if (group === this.reservedGroup && index === this.reservedIndex || group === this.reservedIdleGroup && index === this.reservedIdleIndex) {
      logger.log(this.tag, `Motion is already reserved.`, this.dump(group, index));
      return false;
    }
    if (priority === 1) {
      if (this.currentPriority !== 0) {
        logger.log(
          this.tag,
          `Cannot start idle motion because another motion is playing.`,
          this.dump(group, index)
        );
        return false;
      }
      if (this.reservedIdleGroup !== void 0) {
        logger.log(
          this.tag,
          `Cannot start idle motion because another idle motion has reserved.`,
          this.dump(group, index)
        );
        return false;
      }
      this.setReservedIdle(group, index);
    } else {
      if (priority < 3) {
        if (priority <= this.currentPriority) {
          logger.log(
            this.tag,
            "Cannot start motion because another motion is playing as an equivalent or higher priority.",
            this.dump(group, index)
          );
          return false;
        }
        if (priority <= this.reservePriority) {
          logger.log(
            this.tag,
            "Cannot start motion because another motion has reserved as an equivalent or higher priority.",
            this.dump(group, index)
          );
          return false;
        }
      }
      this.setReserved(group, index, priority);
    }
    return true;
  }
  /**
   * Requests the playback for a motion.
   * @param motion - The Motion, can be undefined.
   * @param group - The motion group.
   * @param index - Index in the motion group.
   * @param priority - The priority to be applied.
   * @return True if the request has been approved, i.e. the motion is allowed to play.
   */
  start(motion, group, index, priority) {
    if (priority === 1) {
      this.setReservedIdle(void 0, void 0);
      if (this.currentPriority !== 0) {
        logger.log(
          this.tag,
          "Cannot start idle motion because another motion is playing.",
          this.dump(group, index)
        );
        return false;
      }
    } else {
      if (group !== this.reservedGroup || index !== this.reservedIndex) {
        logger.log(
          this.tag,
          "Cannot start motion because another motion has taken the place.",
          this.dump(group, index)
        );
        return false;
      }
      this.setReserved(
        void 0,
        void 0,
        0
        /* NONE */
      );
    }
    if (!motion) {
      return false;
    }
    this.setCurrent(group, index, priority);
    return true;
  }
  /**
   * Notifies the motion playback has finished.
   */
  complete() {
    this.setCurrent(
      void 0,
      void 0,
      0
      /* NONE */
    );
  }
  /**
   * Sets the current motion.
   */
  setCurrent(group, index, priority) {
    this.currentPriority = priority;
    this.currentGroup = group;
    this.currentIndex = index;
  }
  /**
   * Sets the reserved motion.
   */
  setReserved(group, index, priority) {
    this.reservePriority = priority;
    this.reservedGroup = group;
    this.reservedIndex = index;
  }
  /**
   * Sets the reserved idle motion.
   */
  setReservedIdle(group, index) {
    this.reservedIdleGroup = group;
    this.reservedIdleIndex = index;
  }
  /**
   * Checks if a Motion is currently playing or has reserved.
   * @return True if active.
   */
  isActive(group, index) {
    return group === this.currentGroup && index === this.currentIndex || group === this.reservedGroup && index === this.reservedIndex || group === this.reservedIdleGroup && index === this.reservedIdleIndex;
  }
  /**
   * Resets the state.
   */
  reset() {
    this.setCurrent(
      void 0,
      void 0,
      0
      /* NONE */
    );
    this.setReserved(
      void 0,
      void 0,
      0
      /* NONE */
    );
    this.setReservedIdle(void 0, void 0);
  }
  /**
   * Checks if an idle motion should be requests to play.
   */
  shouldRequestIdleMotion() {
    return this.currentGroup === void 0 && this.reservedIdleGroup === void 0;
  }
  /**
   * Checks if the model's expression should be overridden by the motion.
   */
  shouldOverrideExpression() {
    return !config.preserveExpressionOnMotion && this.currentPriority > 1;
  }
  /**
   * Dumps the state for debugging.
   */
  dump(requestedGroup, requestedIndex) {
    if (this.debug) {
      const keys = [
        "currentPriority",
        "reservePriority",
        "currentGroup",
        "currentIndex",
        "reservedGroup",
        "reservedIndex",
        "reservedIdleGroup",
        "reservedIdleIndex"
      ];
      return `
<Requested> group = "${requestedGroup}", index = ${requestedIndex}
` + keys.map((key) => "[" + key + "] " + this[key]).join("\n");
    }
    return "";
  }
}
const TAG$2 = "SoundManager";
const VOLUME = 0.5;
class SoundManager {
  /**
   * Global volume that applies to all the sounds.
   */
  static get volume() {
    return this._volume;
  }
  static set volume(value) {
    this._volume = (value > 1 ? 1 : value < 0 ? 0 : value) || 0;
    this.audios.forEach((audio) => audio.volume = this._volume);
  }
  // TODO: return an ID?
  /**
   * Creates an audio element and adds it to the {@link audios}.
   * @param file - URL of the sound file.
   * @param onFinish - Callback invoked when the playback has finished.
   * @param onError - Callback invoked when error occurs.
   * @param crossOrigin - Cross origin setting.
   * @return Created audio element.
   */
  static add(file, onFinish, onError, crossOrigin) {
    const audio = new Audio(file);
    audio.volume = this._volume;
    audio.preload = "auto";
    audio.crossOrigin = crossOrigin;
    audio.addEventListener("ended", () => {
      this.dispose(audio);
      onFinish == null ? void 0 : onFinish();
    });
    audio.addEventListener("error", (e) => {
      this.dispose(audio);
      logger.warn(TAG$2, `Error occurred on "${file}"`, e.error);
      onError == null ? void 0 : onError(e.error);
    });
    this.audios.push(audio);
    return audio;
  }
  /**
   * Plays the sound.
   * @param audio - An audio element.
   * @return Promise that resolves when the audio is ready to play, rejects when error occurs.
   */
  static play(audio) {
    return new Promise((resolve, reject) => {
      var _a;
      (_a = audio.play()) == null ? void 0 : _a.catch((e) => {
        audio.dispatchEvent(new ErrorEvent("error", { error: e }));
        reject(e);
      });
      if (audio.readyState === audio.HAVE_ENOUGH_DATA) {
        resolve();
      } else {
        audio.addEventListener("canplaythrough", resolve);
      }
    });
  }
  static addContext(audio) {
    const context = new AudioContext();
    this.contexts.push(context);
    return context;
  }
  static addAnalyzer(audio, context) {
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = config.fftSize;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);
    analyser.connect(context.destination);
    this.analysers.push(analyser);
    return analyser;
  }
  /**
   * Get volume for lip sync
   * @param analyser - An analyzer element.
   * @return Returns value to feed into lip sync
   */
  static analyze(analyser) {
    if (analyser != void 0) {
      const pcmData = new Float32Array(analyser.fftSize);
      let sumSquares = 0;
      analyser.getFloatTimeDomainData(pcmData);
      for (const amplitude of pcmData) {
        sumSquares += amplitude * amplitude;
      }
      return parseFloat(Math.sqrt(sumSquares / pcmData.length * 20).toFixed(1));
    } else {
      return parseFloat(Math.random().toFixed(1));
    }
  }
  /**
   * Disposes an audio element and removes it from {@link audios}.
   * @param audio - An audio element.
   */
  static dispose(audio) {
    audio.pause();
    audio.removeAttribute("src");
    remove(this.audios, audio);
  }
  /**
   * Destroys all managed audios.
   */
  static destroy() {
    for (let i = this.contexts.length - 1; i >= 0; i--) {
      this.contexts[i].close();
    }
    for (let i = this.audios.length - 1; i >= 0; i--) {
      this.dispose(this.audios[i]);
    }
  }
}
/**
 * Audio elements playing or pending to play. Finished audios will be removed automatically.
 */
__publicField(SoundManager, "audios", []);
__publicField(SoundManager, "analysers", []);
__publicField(SoundManager, "contexts", []);
__publicField(SoundManager, "_volume", VOLUME);
var MotionPreloadStrategy = /* @__PURE__ */ ((MotionPreloadStrategy2) => {
  MotionPreloadStrategy2["ALL"] = "ALL";
  MotionPreloadStrategy2["IDLE"] = "IDLE";
  MotionPreloadStrategy2["NONE"] = "NONE";
  return MotionPreloadStrategy2;
})(MotionPreloadStrategy || {});
class MotionManager extends utils$3.EventEmitter {
  constructor(settings, options) {
    super();
    /**
     * Tag for logging.
     */
    __publicField(this, "tag");
    /**
     * The ModelSettings reference.
     */
    __publicField(this, "settings");
    /**
     * The Motions. The structure is the same as {@link definitions}, initially each group contains
     * an empty array, which means all motions will be `undefined`. When a Motion has been loaded,
     * it'll fill the place in which it should be; when it fails to load, the place will be filled
     * with `null`.
     */
    __publicField(this, "motionGroups", {});
    /**
     * Maintains the state of this MotionManager.
     */
    __publicField(this, "state", new MotionState());
    /**
     * Audio element of the current motion if a sound file is defined with it.
     */
    __publicField(this, "currentAudio");
    /**
     * Analyzer element for the current sound being played.
     */
    __publicField(this, "currentAnalyzer");
    /**
     * Context element for the current sound being played.
     */
    __publicField(this, "currentContext");
    /**
     * Flags there's a motion playing.
     */
    __publicField(this, "playing", false);
    /**
     * Flags the instances has been destroyed.
     */
    __publicField(this, "destroyed", false);
    this.settings = settings;
    this.tag = `MotionManager(${settings.name})`;
    this.state.tag = this.tag;
  }
  /**
   * Should be called in the constructor of derived class.
   */
  init(options) {
    if (options == null ? void 0 : options.idleMotionGroup) {
      this.groups.idle = options.idleMotionGroup;
    }
    this.setupMotions(options);
    this.stopAllMotions();
  }
  /**
   * Sets up motions from the definitions, and preloads them according to the preload strategy.
   */
  setupMotions(options) {
    for (const group of Object.keys(this.definitions)) {
      this.motionGroups[group] = [];
    }
    let groups;
    switch (options == null ? void 0 : options.motionPreload) {
      case "NONE":
        return;
      case "ALL":
        groups = Object.keys(this.definitions);
        break;
      case "IDLE":
      default:
        groups = [this.groups.idle];
        break;
    }
    for (const group of groups) {
      if (this.definitions[group]) {
        for (let i = 0; i < this.definitions[group].length; i++) {
          this.loadMotion(group, i).then();
        }
      }
    }
  }
  /**
   * Loads a Motion in a motion group. Errors in this method will not be thrown,
   * but be emitted with a "motionLoadError" event.
   * @param group - The motion group.
   * @param index - Index in the motion group.
   * @return Promise that resolves with the Motion, or with undefined if it can't be loaded.
   * @emits {@link MotionManagerEvents.motionLoaded}
   * @emits {@link MotionManagerEvents.motionLoadError}
   */
  loadMotion(group, index) {
    return __async(this, null, function* () {
      var _a;
      if (!((_a = this.definitions[group]) == null ? void 0 : _a[index])) {
        logger.warn(this.tag, `Undefined motion at "${group}"[${index}]`);
        return void 0;
      }
      if (this.motionGroups[group][index] === null) {
        logger.warn(
          this.tag,
          `Cannot start motion at "${group}"[${index}] because it's already failed in loading.`
        );
        return void 0;
      }
      if (this.motionGroups[group][index]) {
        return this.motionGroups[group][index];
      }
      const motion = yield this._loadMotion(group, index);
      if (this.destroyed) {
        return;
      }
      this.motionGroups[group][index] = motion != null ? motion : null;
      return motion;
    });
  }
  /**
   * Loads the Motion. Will be implemented by Live2DFactory in order to avoid circular dependency.
   * @ignore
   */
  _loadMotion(group, index) {
    throw new Error("Not implemented.");
  }
  /**
   * Only play sound with lip sync
   * @param sound - The audio url to file or base64 content
   * ### OPTIONAL: {name: value, ...}
   * @param volume - Volume of the sound (0-1)
   * @param expression - In case you want to mix up a expression while playing sound (bind with Model.expression())
   * @param resetExpression - Reset expression before and after playing sound (default: true)
   * @param crossOrigin - Cross origin setting.
   * @returns Promise that resolves with true if the sound is playing, false if it's not
   */
  speak(_0) {
    return __async(this, arguments, function* (sound, {
      volume = VOLUME,
      expression,
      resetExpression = true,
      crossOrigin,
      onFinish,
      onError
    } = {}) {
      if (!config.sound) {
        return false;
      }
      let audio;
      let analyzer;
      let context;
      if (this.currentAudio) {
        if (!this.currentAudio.ended) {
          return false;
        }
      }
      let soundURL;
      const isBase64Content = sound && sound.startsWith("data:");
      if (sound && !isBase64Content) {
        const A = document.createElement("a");
        A.href = sound;
        sound = A.href;
        soundURL = sound;
      } else {
        soundURL = "data:audio/";
      }
      const file = sound;
      if (file) {
        try {
          audio = SoundManager.add(
            file,
            (that = this) => {
              logger.warn(this.tag, "Audio finished playing");
              onFinish == null ? void 0 : onFinish();
              resetExpression && expression && that.expressionManager && that.expressionManager.resetExpression();
              that.currentAudio = void 0;
            },
            // reset expression when audio is done
            (e, that = this) => {
              logger.error(this.tag, "Error during audio playback:", e);
              onError == null ? void 0 : onError(e);
              resetExpression && expression && that.expressionManager && that.expressionManager.resetExpression();
              that.currentAudio = void 0;
            },
            // on error
            crossOrigin
          );
          this.currentAudio = audio;
          SoundManager.volume = volume;
          context = SoundManager.addContext(this.currentAudio);
          this.currentContext = context;
          analyzer = SoundManager.addAnalyzer(this.currentAudio, this.currentContext);
          this.currentAnalyzer = analyzer;
        } catch (e) {
          logger.warn(this.tag, "Failed to create audio", soundURL, e);
          return false;
        }
      }
      if (audio) {
        let playSuccess = true;
        const readyToPlay = SoundManager.play(audio).catch((e) => {
          logger.warn(this.tag, "Failed to play audio", audio.src, e);
          playSuccess = false;
        });
        if (config.motionSync) {
          yield readyToPlay;
          if (!playSuccess) {
            return false;
          }
        }
      }
      if (this.state.shouldOverrideExpression()) {
        this.expressionManager && this.expressionManager.resetExpression();
      }
      if (expression && this.expressionManager) {
        this.expressionManager.setExpression(expression);
      }
      this.playing = true;
      return true;
    });
  }
  /**
   * Starts a motion as given priority.
   * @param group - The motion group.
   * @param index - Index in the motion group.
   * @param priority - The priority to be applied. default: 2 (NORMAL)
   * ### OPTIONAL: {name: value, ...}
   * @param sound - The audio url to file or base64 content
   * @param volume - Volume of the sound (0-1)
   * @param expression - In case you want to mix up a expression while playing sound (bind with Model.expression())
   * @param resetExpression - Reset expression before and after playing sound (default: true)
   * @param crossOrigin - Cross origin setting.
   * @return Promise that resolves with true if the motion is successfully started, with false otherwise.
   */
  startMotion(_0, _1) {
    return __async(this, arguments, function* (group, index, priority = MotionPriority.NORMAL, {
      sound = void 0,
      volume = VOLUME,
      expression = void 0,
      resetExpression = true,
      crossOrigin,
      onFinish,
      onError
    } = {}) {
      var _a;
      if (!this.state.reserve(group, index, priority)) {
        return false;
      }
      if (this.currentAudio) {
        if (!this.currentAudio.ended && priority != MotionPriority.FORCE) {
          return false;
        }
      }
      const definition = (_a = this.definitions[group]) == null ? void 0 : _a[index];
      if (!definition) {
        return false;
      }
      if (this.currentAudio) {
        SoundManager.dispose(this.currentAudio);
      }
      let audio;
      let analyzer;
      let context;
      let soundURL;
      const isBase64Content = sound && sound.startsWith("data:");
      if (sound && !isBase64Content) {
        const A = document.createElement("a");
        A.href = sound;
        sound = A.href;
        soundURL = sound;
      } else {
        soundURL = this.getSoundFile(definition);
        if (soundURL) {
          soundURL = this.settings.resolveURL(soundURL);
        }
      }
      const file = soundURL;
      if (file) {
        try {
          audio = SoundManager.add(
            file,
            (that = this) => {
              onFinish == null ? void 0 : onFinish();
              resetExpression && expression && that.expressionManager && that.expressionManager.resetExpression();
              that.currentAudio = void 0;
            },
            // reset expression when audio is done
            (e, that = this) => {
              logger.error(this.tag, "Error during audio playback:", e);
              onError == null ? void 0 : onError(e);
              resetExpression && expression && that.expressionManager && that.expressionManager.resetExpression();
              that.currentAudio = void 0;
            },
            // on error
            crossOrigin
          );
          this.currentAudio = audio;
          SoundManager.volume = volume;
          context = SoundManager.addContext(this.currentAudio);
          this.currentContext = context;
          analyzer = SoundManager.addAnalyzer(this.currentAudio, this.currentContext);
          this.currentAnalyzer = analyzer;
        } catch (e) {
          logger.warn(this.tag, "Failed to create audio", soundURL, e);
        }
      }
      const motion = yield this.loadMotion(group, index);
      if (audio) {
        const readyToPlay = SoundManager.play(audio).catch(
          (e) => logger.warn(this.tag, "Failed to play audio", audio.src, e)
        );
        if (config.motionSync) {
          yield readyToPlay;
        }
      }
      if (!this.state.start(motion, group, index, priority)) {
        if (audio) {
          SoundManager.dispose(audio);
          this.currentAudio = void 0;
        }
        return false;
      }
      if (this.state.shouldOverrideExpression()) {
        this.expressionManager && this.expressionManager.resetExpression();
      }
      logger.log(this.tag, "Start motion:", this.getMotionName(definition));
      this.emit("motionStart", group, index, audio);
      if (expression && this.expressionManager && this.state.shouldOverrideExpression()) {
        this.expressionManager.setExpression(expression);
      }
      this.playing = true;
      this._startMotion(motion);
      return true;
    });
  }
  /**
   * Starts a random Motion as given priority.
   * @param group - The motion group.
   * @param priority - The priority to be applied. (default: 1 `IDLE`)
   * ### OPTIONAL: {name: value, ...}
   * @param sound - The wav url file or base64 content+
   * @param volume - Volume of the sound (0-1) (default: 1)
   * @param expression - In case you want to mix up a expression while playing sound (name/index)
   * @param resetExpression - Reset expression before and after playing sound (default: true)
   * @return Promise that resolves with true if the motion is successfully started, with false otherwise.
   */
  startRandomMotion(_0, _1) {
    return __async(this, arguments, function* (group, priority, {
      sound,
      volume = VOLUME,
      expression,
      resetExpression = true,
      crossOrigin,
      onFinish,
      onError
    } = {}) {
      const groupDefs = this.definitions[group];
      if (groupDefs == null ? void 0 : groupDefs.length) {
        const availableIndices = [];
        for (let i = 0; i < groupDefs.length; i++) {
          if (this.motionGroups[group][i] !== null && !this.state.isActive(group, i)) {
            availableIndices.push(i);
          }
        }
        if (availableIndices.length) {
          const index = availableIndices[Math.floor(Math.random() * availableIndices.length)];
          return this.startMotion(group, index, priority, {
            sound,
            volume,
            expression,
            resetExpression,
            crossOrigin,
            onFinish,
            onError
          });
        }
      }
      return false;
    });
  }
  /**
   * Stop current audio playback and lipsync
   */
  stopSpeaking() {
    if (this.currentAudio) {
      SoundManager.dispose(this.currentAudio);
      this.currentAudio = void 0;
    }
  }
  /**
   * Stops all playing motions as well as the sound.
   */
  stopAllMotions() {
    this._stopAllMotions();
    this.state.reset();
    this.stopSpeaking();
  }
  /**
   * Updates parameters of the core model.
   * @param model - The core model.
   * @param now - Current time in milliseconds.
   * @return True if the parameters have been actually updated.
   */
  update(model, now) {
    var _a;
    if (this.isFinished()) {
      if (this.playing) {
        this.playing = false;
        this.emit("motionFinish");
      }
      if (this.state.shouldOverrideExpression()) {
        (_a = this.expressionManager) == null ? void 0 : _a.restoreExpression();
      }
      this.state.complete();
      if (this.state.shouldRequestIdleMotion()) {
        this.startRandomMotion(this.groups.idle, MotionPriority.IDLE);
      }
    }
    return this.updateParameters(model, now);
  }
  /**
   * Move the mouth
   *
   */
  mouthSync() {
    if (this.currentAnalyzer) {
      return SoundManager.analyze(this.currentAnalyzer);
    } else {
      return 0;
    }
  }
  /**
   * Destroys the instance.
   * @emits {@link MotionManagerEvents.destroy}
   */
  destroy() {
    var _a;
    this.destroyed = true;
    this.emit("destroy");
    this.stopAllMotions();
    (_a = this.expressionManager) == null ? void 0 : _a.destroy();
    const self2 = this;
    self2.definitions = void 0;
    self2.motionGroups = void 0;
  }
}
const tempBounds = { x: 0, y: 0, width: 0, height: 0 };
class InternalModel extends utils$3.EventEmitter {
  constructor() {
    super(...arguments);
    __publicField(this, "focusController", new FocusController());
    __publicField(this, "pose");
    __publicField(this, "physics");
    /**
     * Original canvas width of the model. Note this doesn't represent the model's real size,
     * as the model can overflow from its canvas.
     */
    __publicField(this, "originalWidth", 0);
    /**
     * Original canvas height of the model. Note this doesn't represent the model's real size,
     * as the model can overflow from its canvas.
     */
    __publicField(this, "originalHeight", 0);
    /**
     * Canvas width of the model, scaled by the `width` of the model's layout.
     */
    __publicField(this, "width", 0);
    /**
     * Canvas height of the model, scaled by the `height` of the model's layout.
     */
    __publicField(this, "height", 0);
    /**
     * Local transformation, calculated from the model's layout.
     */
    __publicField(this, "localTransform", new Matrix());
    /**
     * The final matrix to draw the model.
     */
    __publicField(this, "drawingMatrix", new Matrix());
    // TODO: change structure
    /**
     * The hit area definitions, keyed by their names.
     */
    __publicField(this, "hitAreas", {});
    /**
     * Flags whether `gl.UNPACK_FLIP_Y_WEBGL` should be enabled when binding the textures.
     */
    __publicField(this, "textureFlipY", false);
    /**
     * WebGL viewport when drawing the model. The format is `[x, y, width, height]`.
     */
    __publicField(this, "viewport", [0, 0, 0, 0]);
    /**
     * Flags this instance has been destroyed.
     */
    __publicField(this, "destroyed", false);
  }
  /**
   * Should be called in the constructor of derived class.
   */
  init() {
    this.setupLayout();
    this.setupHitAreas();
  }
  /**
   * Sets up the model's size and local transform by the model's layout.
   */
  setupLayout() {
    const self2 = this;
    const size = this.getSize();
    self2.originalWidth = size[0];
    self2.originalHeight = size[1];
    const layout = Object.assign(
      {
        width: LOGICAL_WIDTH,
        height: LOGICAL_HEIGHT
      },
      this.getLayout()
    );
    this.localTransform.scale(layout.width / LOGICAL_WIDTH, layout.height / LOGICAL_HEIGHT);
    self2.width = this.originalWidth * this.localTransform.a;
    self2.height = this.originalHeight * this.localTransform.d;
    const offsetX = layout.x !== void 0 && layout.x - layout.width / 2 || layout.centerX !== void 0 && layout.centerX || layout.left !== void 0 && layout.left - layout.width / 2 || layout.right !== void 0 && layout.right + layout.width / 2 || 0;
    const offsetY = layout.y !== void 0 && layout.y - layout.height / 2 || layout.centerY !== void 0 && layout.centerY || layout.top !== void 0 && layout.top - layout.height / 2 || layout.bottom !== void 0 && layout.bottom + layout.height / 2 || 0;
    this.localTransform.translate(this.width * offsetX, -this.height * offsetY);
  }
  /**
   * Sets up the hit areas by their definitions in settings.
   */
  setupHitAreas() {
    const definitions = this.getHitAreaDefs().filter((hitArea) => hitArea.index >= 0);
    for (const def of definitions) {
      this.hitAreas[def.name] = def;
    }
  }
  /**
   * Hit-test on the model.
   * @param x - Position in model canvas.
   * @param y - Position in model canvas.
   * @return The names of the *hit* hit areas. Can be empty if none is hit.
   */
  hitTest(x, y) {
    return Object.keys(this.hitAreas).filter((hitAreaName) => this.isHit(hitAreaName, x, y));
  }
  /**
   * Hit-test for a single hit area.
   * @param hitAreaName - The hit area's name.
   * @param x - Position in model canvas.
   * @param y - Position in model canvas.
   * @return True if hit.
   */
  isHit(hitAreaName, x, y) {
    if (!this.hitAreas[hitAreaName]) {
      return false;
    }
    const drawIndex = this.hitAreas[hitAreaName].index;
    const bounds = this.getDrawableBounds(drawIndex, tempBounds);
    return bounds.x <= x && x <= bounds.x + bounds.width && bounds.y <= y && y <= bounds.y + bounds.height;
  }
  /**
   * Gets a drawable's bounds.
   * @param index - Index of the drawable.
   * @param bounds - Object to store the output values.
   * @return The bounds in model canvas space.
   */
  getDrawableBounds(index, bounds) {
    const vertices = this.getDrawableVertices(index);
    let left = vertices[0];
    let right = vertices[0];
    let top = vertices[1];
    let bottom = vertices[1];
    for (let i = 0; i < vertices.length; i += 2) {
      const vx = vertices[i];
      const vy = vertices[i + 1];
      left = Math.min(vx, left);
      right = Math.max(vx, right);
      top = Math.min(vy, top);
      bottom = Math.max(vy, bottom);
    }
    bounds != null ? bounds : bounds = {};
    bounds.x = left;
    bounds.y = top;
    bounds.width = right - left;
    bounds.height = bottom - top;
    return bounds;
  }
  /**
   * Updates the model's transform.
   * @param transform - The world transform.
   */
  updateTransform(transform) {
    this.drawingMatrix.copyFrom(transform).append(this.localTransform);
  }
  /**
   * Updates the model's parameters.
   * @param dt - Elapsed time in milliseconds from last frame.
   * @param now - Current time in milliseconds.
   */
  update(dt, now) {
    this.focusController.update(dt);
  }
  /**
   * Destroys the model and all related resources.
   * @emits {@link InternalModelEvents.destroy | destroy}
   */
  destroy() {
    this.destroyed = true;
    this.emit("destroy");
    this.motionManager.destroy();
    this.motionManager = void 0;
    this.parallelMotionManager.forEach((m) => m.destroy());
    this.parallelMotionManager = [];
  }
}
const TAG$1 = "XHRLoader";
class NetworkError extends Error {
  constructor(message, url2, status, aborted = false) {
    super(message);
    this.url = url2;
    this.status = status;
    this.aborted = aborted;
  }
}
const _XHRLoader = class _XHRLoader {
  /**
   * Creates a managed XHR.
   * @param target - If provided, the XHR will be canceled when receiving an "destroy" event from the target.
   * @param url - The URL.
   * @param type - The XHR response type.
   * @param onload - Load listener.
   * @param onerror - Error handler.
   */
  static createXHR(target, url2, type2, onload, onerror) {
    const xhr = new XMLHttpRequest();
    _XHRLoader.allXhrSet.add(xhr);
    if (target) {
      let xhrSet = _XHRLoader.xhrMap.get(target);
      if (!xhrSet) {
        xhrSet = /* @__PURE__ */ new Set([xhr]);
        _XHRLoader.xhrMap.set(target, xhrSet);
      } else {
        xhrSet.add(xhr);
      }
      if (!target.listeners("destroy").includes(_XHRLoader.cancelXHRs)) {
        target.once("destroy", _XHRLoader.cancelXHRs);
      }
    }
    xhr.open("GET", url2);
    xhr.responseType = type2;
    xhr.onload = () => {
      if ((xhr.status === 200 || xhr.status === 0) && xhr.response) {
        onload(xhr.response);
      } else {
        xhr.onerror();
      }
    };
    xhr.onerror = () => {
      logger.warn(
        TAG$1,
        `Failed to load resource as ${xhr.responseType} (Status ${xhr.status}): ${url2}`
      );
      onerror(new NetworkError("Network error.", url2, xhr.status));
    };
    xhr.onabort = () => onerror(new NetworkError("Aborted.", url2, xhr.status, true));
    xhr.onloadend = () => {
      var _a;
      _XHRLoader.allXhrSet.delete(xhr);
      if (target) {
        (_a = _XHRLoader.xhrMap.get(target)) == null ? void 0 : _a.delete(xhr);
      }
    };
    return xhr;
  }
  /**
   * Cancels all XHRs related to this target.
   */
  static cancelXHRs() {
    var _a;
    (_a = _XHRLoader.xhrMap.get(this)) == null ? void 0 : _a.forEach((xhr) => {
      xhr.abort();
      _XHRLoader.allXhrSet.delete(xhr);
    });
    _XHRLoader.xhrMap.delete(this);
  }
  /**
   * Release all XHRs.
   */
  static release() {
    _XHRLoader.allXhrSet.forEach((xhr) => xhr.abort());
    _XHRLoader.allXhrSet.clear();
    _XHRLoader.xhrMap = /* @__PURE__ */ new WeakMap();
  }
};
/**
 * All the created XHRs, keyed by their owners respectively.
 */
__publicField(_XHRLoader, "xhrMap", /* @__PURE__ */ new WeakMap());
/**
 * All the created XHRs as a flat array.
 */
__publicField(_XHRLoader, "allXhrSet", /* @__PURE__ */ new Set());
/**
 * Middleware for Live2DLoader.
 */
__publicField(_XHRLoader, "loader", (context, next) => {
  return new Promise((resolve, reject) => {
    const xhr = _XHRLoader.createXHR(
      context.target,
      context.settings ? context.settings.resolveURL(context.url) : context.url,
      context.type,
      (data) => {
        context.result = data;
        resolve();
      },
      reject
    );
    xhr.send();
  });
});
let XHRLoader = _XHRLoader;
function runMiddlewares(middleware, context) {
  let index = -1;
  return dispatch(0);
  function dispatch(i, err) {
    if (err)
      return Promise.reject(err);
    if (i <= index)
      return Promise.reject(new Error("next() called multiple times"));
    index = i;
    const fn = middleware[i];
    if (!fn)
      return Promise.resolve();
    try {
      return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
    } catch (err2) {
      return Promise.reject(err2);
    }
  }
}
class Live2DLoader {
  /**
   * Loads a resource.
   * @return Promise that resolves with the loaded data in a format that's consistent with the specified `type`.
   */
  static load(context) {
    return runMiddlewares(this.middlewares, context).then(() => context.result);
  }
}
__publicField(Live2DLoader, "middlewares", [XHRLoader.loader]);
function createTexture(url2, options = {}) {
  var _a;
  const textureOptions = { resourceOptions: { crossorigin: options.crossOrigin } };
  if (Texture.fromURL) {
    return Texture.fromURL(url2, textureOptions).catch((e) => {
      if (e instanceof Error) {
        throw e;
      }
      const err = new Error("Texture loading error");
      err.event = e;
      throw err;
    });
  }
  textureOptions.resourceOptions.autoLoad = false;
  const texture = Texture.from(url2, textureOptions);
  if (texture.baseTexture.valid) {
    return Promise.resolve(texture);
  }
  const resource = texture.baseTexture.resource;
  (_a = resource._live2d_load) != null ? _a : resource._live2d_load = new Promise((resolve, reject) => {
    const errorHandler = (event) => {
      resource.source.removeEventListener("error", errorHandler);
      const err = new Error("Texture loading error");
      err.event = event;
      reject(err);
    };
    resource.source.addEventListener("error", errorHandler);
    resource.load().then(() => resolve(texture)).catch(errorHandler);
  });
  return resource._live2d_load;
}
function noop() {
}
const TAG = "Live2DFactory";
const urlToJSON = (context, next) => __async(void 0, null, function* () {
  if (typeof context.source === "string") {
    const data = yield Live2DLoader.load({
      url: context.source,
      type: "json",
      target: context.live2dModel
    });
    data.url = context.source;
    context.source = data;
    context.live2dModel.emit("settingsJSONLoaded", data);
  }
  return next();
});
const jsonToSettings = (context, next) => __async(void 0, null, function* () {
  if (context.source instanceof ModelSettings) {
    context.settings = context.source;
    return next();
  } else if (typeof context.source === "object") {
    const runtime = Live2DFactory.findRuntime(context.source);
    if (runtime) {
      const settings = runtime.createModelSettings(context.source);
      context.settings = settings;
      context.live2dModel.emit("settingsLoaded", settings);
      return next();
    }
  }
  throw new TypeError("Unknown settings format.");
});
const waitUntilReady = (context, next) => {
  if (context.settings) {
    const runtime = Live2DFactory.findRuntime(context.settings);
    if (runtime) {
      return runtime.ready().then(next);
    }
  }
  return next();
};
const setupOptionals = (context, next) => __async(void 0, null, function* () {
  yield next();
  const internalModel = context.internalModel;
  if (internalModel) {
    const settings = context.settings;
    const runtime = Live2DFactory.findRuntime(settings);
    if (runtime) {
      const tasks = [];
      if (settings.pose) {
        tasks.push(
          Live2DLoader.load({
            settings,
            url: settings.pose,
            type: "json",
            target: internalModel
          }).then((data) => {
            internalModel.pose = runtime.createPose(internalModel.coreModel, data);
            context.live2dModel.emit("poseLoaded", internalModel.pose);
          }).catch((e) => {
            context.live2dModel.emit("poseLoadError", e);
            logger.warn(TAG, "Failed to load pose.", e);
          })
        );
      }
      if (settings.physics) {
        tasks.push(
          Live2DLoader.load({
            settings,
            url: settings.physics,
            type: "json",
            target: internalModel
          }).then((data) => {
            internalModel.physics = runtime.createPhysics(
              internalModel.coreModel,
              data
            );
            context.live2dModel.emit("physicsLoaded", internalModel.physics);
          }).catch((e) => {
            context.live2dModel.emit("physicsLoadError", e);
            logger.warn(TAG, "Failed to load physics.", e);
          })
        );
      }
      if (tasks.length) {
        yield Promise.all(tasks);
      }
    }
  }
});
const setupEssentials = (context, next) => __async(void 0, null, function* () {
  if (context.settings) {
    const live2DModel = context.live2dModel;
    const loadingTextures = Promise.all(
      context.settings.textures.map((tex) => {
        const url2 = context.settings.resolveURL(tex);
        return createTexture(url2, { crossOrigin: context.options.crossOrigin });
      })
    );
    loadingTextures.catch(noop);
    yield next();
    if (context.internalModel) {
      live2DModel.internalModel = context.internalModel;
      live2DModel.emit("modelLoaded", context.internalModel);
    } else {
      throw new TypeError("Missing internal model.");
    }
    live2DModel.textures = yield loadingTextures;
    live2DModel.emit("textureLoaded", live2DModel.textures);
  } else {
    throw new TypeError("Missing settings.");
  }
});
const createInternalModel = (context, next) => __async(void 0, null, function* () {
  const settings = context.settings;
  if (settings instanceof ModelSettings) {
    const runtime = Live2DFactory.findRuntime(settings);
    if (!runtime) {
      throw new TypeError("Unknown model settings.");
    }
    const modelData = yield Live2DLoader.load({
      settings,
      url: settings.moc,
      type: "arraybuffer",
      target: context.live2dModel
    });
    if (!runtime.isValidMoc(modelData)) {
      throw new Error("Invalid moc data");
    }
    const coreModel = runtime.createCoreModel(modelData);
    context.internalModel = runtime.createInternalModel(coreModel, settings, context.options);
    return next();
  }
  throw new TypeError("Missing settings.");
});
const _ZipLoader = class _ZipLoader {
  static unzip(reader, settings) {
    return __async(this, null, function* () {
      const filePaths = yield _ZipLoader.getFilePaths(reader);
      const requiredFilePaths = [];
      for (const definedFile of settings.getDefinedFiles()) {
        const actualPath = decodeURI(url.resolve(settings.url, definedFile));
        if (filePaths.includes(actualPath)) {
          requiredFilePaths.push(actualPath);
        }
      }
      const files = yield _ZipLoader.getFiles(reader, requiredFilePaths);
      for (let i = 0; i < files.length; i++) {
        const path = requiredFilePaths[i];
        const file = files[i];
        Object.defineProperty(file, "webkitRelativePath", {
          value: path
        });
      }
      return files;
    });
  }
  static createSettings(reader) {
    return __async(this, null, function* () {
      const filePaths = yield _ZipLoader.getFilePaths(reader);
      const settingsFilePath = filePaths.find(
        (path) => path.endsWith("model.json") || path.endsWith("model3.json")
      );
      if (!settingsFilePath) {
        throw new Error("Settings file not found");
      }
      const settingsText = yield _ZipLoader.readText(reader, settingsFilePath);
      if (!settingsText) {
        throw new Error("Empty settings file: " + settingsFilePath);
      }
      const settingsJSON = JSON.parse(settingsText);
      settingsJSON.url = settingsFilePath;
      const runtime = _ZipLoader.live2dFactory.findRuntime(settingsJSON);
      if (!runtime) {
        throw new Error("Unknown settings JSON");
      }
      return runtime.createModelSettings(settingsJSON);
    });
  }
  static zipReader(data, url2) {
    return __async(this, null, function* () {
      throw new Error("Not implemented");
    });
  }
  static getFilePaths(reader) {
    return __async(this, null, function* () {
      throw new Error("Not implemented");
    });
  }
  static getFiles(reader, paths) {
    return __async(this, null, function* () {
      throw new Error("Not implemented");
    });
  }
  static readText(reader, path) {
    return __async(this, null, function* () {
      throw new Error("Not implemented");
    });
  }
  static releaseReader(reader) {
  }
};
// will be set by Live2DFactory
__publicField(_ZipLoader, "live2dFactory");
__publicField(_ZipLoader, "ZIP_PROTOCOL", "zip://");
__publicField(_ZipLoader, "uid", 0);
__publicField(_ZipLoader, "factory", (context, next) => __async(_ZipLoader, null, function* () {
  const source = context.source;
  let sourceURL;
  let zipBlob;
  let settings;
  if (typeof source === "string" && (source.endsWith(".zip") || source.startsWith(_ZipLoader.ZIP_PROTOCOL))) {
    if (source.startsWith(_ZipLoader.ZIP_PROTOCOL)) {
      sourceURL = source.slice(_ZipLoader.ZIP_PROTOCOL.length);
    } else {
      sourceURL = source;
    }
    zipBlob = yield Live2DLoader.load({
      url: sourceURL,
      type: "blob",
      target: context.live2dModel
    });
  } else if (Array.isArray(source) && source.length === 1 && source[0] instanceof File && source[0].name.endsWith(".zip")) {
    zipBlob = source[0];
    sourceURL = URL.createObjectURL(zipBlob);
    settings = source.settings;
  }
  if (zipBlob) {
    if (!zipBlob.size) {
      throw new Error("Empty zip file");
    }
    const reader = yield _ZipLoader.zipReader(zipBlob, sourceURL);
    if (!settings) {
      settings = yield _ZipLoader.createSettings(reader);
    }
    settings._objectURL = _ZipLoader.ZIP_PROTOCOL + _ZipLoader.uid + "/" + settings.url;
    const files = yield _ZipLoader.unzip(reader, settings);
    files.settings = settings;
    context.source = files;
    if (sourceURL.startsWith("blob:")) {
      context.live2dModel.once("modelLoaded", (internalModel) => {
        internalModel.once("destroy", function() {
          URL.revokeObjectURL(sourceURL);
        });
      });
    }
    _ZipLoader.releaseReader(reader);
  }
  return next();
}));
let ZipLoader = _ZipLoader;
const _FileLoader = class _FileLoader {
  /**
   * Resolves the path of a resource file to the object URL.
   * @param settingsURL - Object URL of the settings file.
   * @param filePath - Resource file path.
   * @return Resolved object URL.
   */
  static resolveURL(settingsURL, filePath) {
    var _a;
    const resolved = (_a = _FileLoader.filesMap[settingsURL]) == null ? void 0 : _a[filePath];
    if (resolved === void 0) {
      throw new Error("Cannot find this file from uploaded files: " + filePath);
    }
    return resolved;
  }
  /**
   * Consumes the files by storing their object URLs. Files not defined in the settings will be ignored.
   */
  static upload(files, settings) {
    return __async(this, null, function* () {
      const fileMap = {};
      for (const definedFile of settings.getDefinedFiles()) {
        const actualPath = decodeURI(url.resolve(settings.url, definedFile));
        const actualFile = files.find((file) => file.webkitRelativePath === actualPath);
        if (actualFile) {
          fileMap[definedFile] = URL.createObjectURL(actualFile);
        }
      }
      _FileLoader.filesMap[settings._objectURL] = fileMap;
    });
  }
  /**
   * Creates a ModelSettings by given files.
   * @return Promise that resolves with the created ModelSettings.
   */
  static createSettings(files) {
    return __async(this, null, function* () {
      const settingsFile = files.find(
        (file) => file.name.endsWith("model.json") || file.name.endsWith("model3.json")
      );
      if (!settingsFile) {
        throw new TypeError("Settings file not found");
      }
      const settingsText = yield _FileLoader.readText(settingsFile);
      const settingsJSON = JSON.parse(settingsText);
      settingsJSON.url = settingsFile.webkitRelativePath;
      const runtime = Live2DFactory.findRuntime(settingsJSON);
      if (!runtime) {
        throw new Error("Unknown settings JSON");
      }
      const settings = runtime.createModelSettings(settingsJSON);
      settings._objectURL = URL.createObjectURL(settingsFile);
      return settings;
    });
  }
  /**
   * Reads a file as text in UTF-8.
   */
  static readText(file) {
    return __async(this, null, function* () {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file, "utf8");
      });
    });
  }
};
// will be set by Live2DFactory
__publicField(_FileLoader, "live2dFactory");
/**
 * Stores all the object URLs of uploaded files.
 */
__publicField(_FileLoader, "filesMap", {});
/**
 * Middleware for Live2DFactory.
 */
__publicField(_FileLoader, "factory", (context, next) => __async(_FileLoader, null, function* () {
  if (Array.isArray(context.source) && context.source[0] instanceof File) {
    const files = context.source;
    let settings = files.settings;
    if (!settings) {
      settings = yield _FileLoader.createSettings(files);
    } else if (!settings._objectURL) {
      throw new Error('"_objectURL" must be specified in ModelSettings');
    }
    settings.validateFiles(files.map((file) => encodeURI(file.webkitRelativePath)));
    yield _FileLoader.upload(files, settings);
    settings.resolveURL = function(url2) {
      return _FileLoader.resolveURL(this._objectURL, url2);
    };
    context.source = settings;
    context.live2dModel.once("modelLoaded", (internalModel) => {
      internalModel.once("destroy", function() {
        const objectURL = this.settings._objectURL;
        URL.revokeObjectURL(objectURL);
        if (_FileLoader.filesMap[objectURL]) {
          for (const resourceObjectURL of Object.values(
            _FileLoader.filesMap[objectURL]
          )) {
            URL.revokeObjectURL(resourceObjectURL);
          }
        }
        delete _FileLoader.filesMap[objectURL];
      });
    });
  }
  return next();
}));
let FileLoader = _FileLoader;
const _Live2DFactory = class _Live2DFactory {
  /**
   * Registers a Live2DRuntime.
   */
  static registerRuntime(runtime) {
    _Live2DFactory.runtimes.push(runtime);
    _Live2DFactory.runtimes.sort((a, b) => b.version - a.version);
  }
  /**
   * Finds a runtime that matches given source.
   * @param source - Either a settings JSON object or a ModelSettings instance.
   * @return The Live2DRuntime, or undefined if not found.
   */
  static findRuntime(source) {
    for (const runtime of _Live2DFactory.runtimes) {
      if (runtime.test(source)) {
        return runtime;
      }
    }
  }
  /**
   * Sets up a Live2DModel, populating it with all defined resources.
   * @param live2dModel - The Live2DModel instance.
   * @param source - Can be one of: settings file URL, settings JSON object, ModelSettings instance.
   * @param options - Options for the process.
   * @return Promise that resolves when all resources have been loaded, rejects when error occurs.
   */
  static setupLive2DModel(live2dModel, source, options) {
    return __async(this, null, function* () {
      const textureLoaded = new Promise((resolve) => live2dModel.once("textureLoaded", resolve));
      const modelLoaded = new Promise((resolve) => live2dModel.once("modelLoaded", resolve));
      const readyEventEmitted = Promise.all([textureLoaded, modelLoaded]).then(
        () => live2dModel.emit("ready")
      );
      yield runMiddlewares(_Live2DFactory.live2DModelMiddlewares, {
        live2dModel,
        source,
        options: options || {}
      });
      yield readyEventEmitted;
      live2dModel.emit("load");
    });
  }
  /**
   * Loads a Motion and registers the task to {@link motionTasksMap}. The task will be automatically
   * canceled when its owner - the MotionManager instance - has been destroyed.
   * @param motionManager - MotionManager that owns this Motion.
   * @param group - The motion group.
   * @param index - Index in the motion group.
   * @return Promise that resolves with the Motion, or with undefined if it can't be loaded.
   */
  static loadMotion(motionManager, group, index) {
    var _a, _b;
    const handleError = (e) => motionManager.emit("motionLoadError", group, index, e);
    try {
      const definition = (_a = motionManager.definitions[group]) == null ? void 0 : _a[index];
      if (!definition) {
        return Promise.resolve(void 0);
      }
      if (!motionManager.listeners("destroy").includes(_Live2DFactory.releaseTasks)) {
        motionManager.once("destroy", _Live2DFactory.releaseTasks);
      }
      let tasks = _Live2DFactory.motionTasksMap.get(motionManager);
      if (!tasks) {
        tasks = {};
        _Live2DFactory.motionTasksMap.set(motionManager, tasks);
      }
      let taskGroup = tasks[group];
      if (!taskGroup) {
        taskGroup = [];
        tasks[group] = taskGroup;
      }
      const path = motionManager.getMotionFile(definition);
      (_b = taskGroup[index]) != null ? _b : taskGroup[index] = Live2DLoader.load({
        url: path,
        settings: motionManager.settings,
        type: motionManager.motionDataType,
        target: motionManager
      }).then((data) => {
        var _a2;
        const taskGroup2 = (_a2 = _Live2DFactory.motionTasksMap.get(motionManager)) == null ? void 0 : _a2[group];
        if (taskGroup2) {
          delete taskGroup2[index];
        }
        const motion = motionManager.createMotion(data, group, definition);
        motionManager.emit("motionLoaded", group, index, motion);
        return motion;
      }).catch((e) => {
        logger.warn(motionManager.tag, `Failed to load motion: ${path}
`, e);
        handleError(e);
      });
      return taskGroup[index];
    } catch (e) {
      logger.warn(motionManager.tag, `Failed to load motion at "${group}"[${index}]
`, e);
      handleError(e);
    }
    return Promise.resolve(void 0);
  }
  /**
   * Loads an Expression and registers the task to {@link expressionTasksMap}. The task will be automatically
   * canceled when its owner - the ExpressionManager instance - has been destroyed.
   * @param expressionManager - ExpressionManager that owns this Expression.
   * @param index - Index of the Expression.
   * @return Promise that resolves with the Expression, or with undefined if it can't be loaded.
   */
  static loadExpression(expressionManager, index) {
    var _a;
    const handleError = (e) => expressionManager.emit("expressionLoadError", index, e);
    try {
      const definition = expressionManager.definitions[index];
      if (!definition) {
        return Promise.resolve(void 0);
      }
      if (!expressionManager.listeners("destroy").includes(_Live2DFactory.releaseTasks)) {
        expressionManager.once("destroy", _Live2DFactory.releaseTasks);
      }
      let tasks = _Live2DFactory.expressionTasksMap.get(expressionManager);
      if (!tasks) {
        tasks = [];
        _Live2DFactory.expressionTasksMap.set(expressionManager, tasks);
      }
      const path = expressionManager.getExpressionFile(definition);
      (_a = tasks[index]) != null ? _a : tasks[index] = Live2DLoader.load({
        url: path,
        settings: expressionManager.settings,
        type: "json",
        target: expressionManager
      }).then((data) => {
        const tasks2 = _Live2DFactory.expressionTasksMap.get(expressionManager);
        if (tasks2) {
          delete tasks2[index];
        }
        const expression = expressionManager.createExpression(data, definition);
        expressionManager.emit("expressionLoaded", index, expression);
        return expression;
      }).catch((e) => {
        logger.warn(expressionManager.tag, `Failed to load expression: ${path}
`, e);
        handleError(e);
      });
      return tasks[index];
    } catch (e) {
      logger.warn(expressionManager.tag, `Failed to load expression at [${index}]
`, e);
      handleError(e);
    }
    return Promise.resolve(void 0);
  }
  static releaseTasks() {
    if (this instanceof MotionManager) {
      _Live2DFactory.motionTasksMap.delete(this);
    } else {
      _Live2DFactory.expressionTasksMap.delete(this);
    }
  }
};
/**
 * All registered runtimes, sorted by versions in descending order.
 */
__publicField(_Live2DFactory, "runtimes", []);
__publicField(_Live2DFactory, "urlToJSON", urlToJSON);
__publicField(_Live2DFactory, "jsonToSettings", jsonToSettings);
__publicField(_Live2DFactory, "waitUntilReady", waitUntilReady);
__publicField(_Live2DFactory, "setupOptionals", setupOptionals);
__publicField(_Live2DFactory, "setupEssentials", setupEssentials);
__publicField(_Live2DFactory, "createInternalModel", createInternalModel);
/**
 * Middlewares to run through when setting up a Live2DModel.
 */
__publicField(_Live2DFactory, "live2DModelMiddlewares", [
  ZipLoader.factory,
  FileLoader.factory,
  urlToJSON,
  jsonToSettings,
  waitUntilReady,
  setupOptionals,
  setupEssentials,
  createInternalModel
]);
/**
 * load tasks of each motion. The structure of each value in this map
 * is the same as respective {@link MotionManager.definitions}.
 */
__publicField(_Live2DFactory, "motionTasksMap", /* @__PURE__ */ new WeakMap());
/**
 * Load tasks of each expression.
 */
__publicField(_Live2DFactory, "expressionTasksMap", /* @__PURE__ */ new WeakMap());
let Live2DFactory = _Live2DFactory;
MotionManager.prototype["_loadMotion"] = function(group, index) {
  return Live2DFactory.loadMotion(this, group, index);
};
ExpressionManager.prototype["_loadExpression"] = function(index) {
  return Live2DFactory.loadExpression(this, index);
};
FileLoader["live2dFactory"] = Live2DFactory;
ZipLoader["live2dFactory"] = Live2DFactory;
const _Automator = class _Automator {
  constructor(model, {
    autoUpdate = true,
    autoHitTest = true,
    autoFocus = true,
    autoInteract,
    ticker
  } = {}) {
    __publicField(this, "model");
    __publicField(this, "destroyed", false);
    __publicField(this, "_ticker");
    __publicField(this, "_autoUpdate", false);
    __publicField(this, "_autoHitTest", false);
    __publicField(this, "_autoFocus", false);
    if (!ticker) {
      if (_Automator.defaultTicker) {
        ticker = _Automator.defaultTicker;
      } else if (typeof PIXI !== "undefined") {
        ticker = PIXI.Ticker.shared;
      }
    }
    if (autoInteract !== void 0) {
      autoHitTest = autoInteract;
      autoFocus = autoInteract;
      logger.warn(
        model.tag,
        "options.autoInteract is deprecated since v0.5.0, use autoHitTest and autoFocus instead."
      );
    }
    this.model = model;
    this.ticker = ticker;
    this.autoUpdate = autoUpdate;
    this.autoHitTest = autoHitTest;
    this.autoFocus = autoFocus;
    if (autoHitTest || autoFocus) {
      this.model.eventMode = "static";
    }
  }
  get ticker() {
    return this._ticker;
  }
  set ticker(ticker) {
    var _a;
    if (this._ticker) {
      this._ticker.remove(onTickerUpdate, this);
    }
    this._ticker = ticker;
    if (this._autoUpdate) {
      (_a = this._ticker) == null ? void 0 : _a.add(onTickerUpdate, this);
    }
  }
  /**
   * @see {@link AutomatorOptions.autoUpdate}
   */
  get autoUpdate() {
    return this._autoUpdate;
  }
  set autoUpdate(autoUpdate) {
    var _a;
    if (this.destroyed) {
      return;
    }
    if (autoUpdate) {
      if (this._ticker) {
        this._ticker.add(onTickerUpdate, this);
        this._autoUpdate = true;
      } else {
        logger.warn(
          this.model.tag,
          "No Ticker to be used for automatic updates. Either set option.ticker when creating Live2DModel, or expose PIXI to global scope (window.PIXI = PIXI)."
        );
      }
    } else {
      (_a = this._ticker) == null ? void 0 : _a.remove(onTickerUpdate, this);
      this._autoUpdate = false;
    }
  }
  /**
   * @see {@link AutomatorOptions.autoHitTest}
   */
  get autoHitTest() {
    return this._autoHitTest;
  }
  set autoHitTest(autoHitTest) {
    if (autoHitTest !== this.autoHitTest) {
      if (autoHitTest) {
        this.model.on("pointertap", onTap, this);
      } else {
        this.model.off("pointertap", onTap, this);
      }
      this._autoHitTest = autoHitTest;
    }
  }
  /**
   * @see {@link AutomatorOptions.autoFocus}
   */
  get autoFocus() {
    return this._autoFocus;
  }
  set autoFocus(autoFocus) {
    if (autoFocus !== this.autoFocus) {
      if (autoFocus) {
        this.model.on("globalpointermove", onPointerMove, this);
      } else {
        this.model.off("globalpointermove", onPointerMove, this);
      }
      this._autoFocus = autoFocus;
    }
  }
  /**
   * @see {@link AutomatorOptions.autoInteract}
   */
  get autoInteract() {
    return this._autoHitTest && this._autoFocus;
  }
  set autoInteract(autoInteract) {
    this.autoHitTest = autoInteract;
    this.autoFocus = autoInteract;
  }
  onTickerUpdate() {
    const deltaMS = this.ticker.deltaMS;
    this.model.update(deltaMS);
  }
  onTap(event) {
    this.model.tap(event.global.x, event.global.y);
  }
  onPointerMove(event) {
    this.model.focus(event.global.x, event.global.y);
  }
  destroy() {
    this.autoFocus = false;
    this.autoHitTest = false;
    this.autoUpdate = false;
    this.ticker = void 0;
    this.destroyed = true;
  }
};
__publicField(_Automator, "defaultTicker");
let Automator = _Automator;
function onTickerUpdate() {
  this.onTickerUpdate();
}
function onTap(event) {
  this.onTap(event);
}
function onPointerMove(event) {
  this.onPointerMove(event);
}
class Live2DTransform extends Transform {
}
const tempPoint = new Point();
const tempMatrix = new Matrix();
class Live2DModel extends Container {
  constructor(options) {
    super();
    /**
     * Tag for logging.
     */
    __publicField(this, "tag", "Live2DModel(uninitialized)");
    /**
     * The internal model. Though typed as non-nullable, it'll be undefined until the "ready" event is emitted.
     */
    __publicField(this, "internalModel");
    /**
     * Pixi textures.
     */
    __publicField(this, "textures", []);
    /** @override */
    __publicField(this, "transform", new Live2DTransform());
    /**
     * The anchor behaves like the one in `PIXI.Sprite`, where `(0, 0)` means the top left
     * and `(1, 1)` means the bottom right.
     */
    __publicField(this, "anchor", new ObservablePoint(this.onAnchorChange, this, 0, 0));
    // cast the type because it breaks the casting of Live2DModel
    /**
     * An ID of Gl context that syncs with `renderer.CONTEXT_UID`. Used to check if the GL context has changed.
     */
    __publicField(this, "glContextID", -1);
    /**
     * Elapsed time in milliseconds since created.
     */
    __publicField(this, "elapsedTime", 0);
    /**
     * Elapsed time in milliseconds from last frame to this frame.
     */
    __publicField(this, "deltaTime", 0);
    __publicField(this, "automator");
    this.automator = new Automator(this, options);
    this.once("modelLoaded", () => this.init(options));
  }
  /**
   * Creates a Live2DModel from given source.
   * @param source - Can be one of: settings file URL, settings JSON object, ModelSettings instance.
   * @param options - Options for the creation.
   * @return Promise that resolves with the Live2DModel.
   */
  static from(source, options) {
    const model = new this(options);
    return Live2DFactory.setupLive2DModel(model, source, options).then(() => model);
  }
  /**
   * Synchronous version of `Live2DModel.from()`. This method immediately returns a Live2DModel instance,
   * whose resources have not been loaded. Therefore this model can't be manipulated or rendered
   * until the "load" event has been emitted.
   *
   * ```js
   * // no `await` here as it's not a Promise
   * const model = Live2DModel.fromSync('shizuku.model.json');
   *
   * // these will cause errors!
   * // app.stage.addChild(model);
   * // model.motion('tap_body');
   *
   * model.once('load', () => {
   *     // now it's safe
   *     app.stage.addChild(model);
   *     model.motion('tap_body');
   * });
   * ```
   */
  static fromSync(source, options) {
    const model = new this(options);
    Live2DFactory.setupLive2DModel(model, source, options).then(options == null ? void 0 : options.onLoad).catch(options == null ? void 0 : options.onError);
    return model;
  }
  /**
   * Registers the class of `PIXI.Ticker` for auto updating.
   * @deprecated Use {@link Live2DModelOptions.ticker} instead.
   */
  static registerTicker(tickerClass) {
    Automator["defaultTicker"] = tickerClass.shared;
  }
  // TODO: rename
  /**
   * A handler of the "modelLoaded" event, invoked when the internal model has been loaded.
   */
  init(options) {
    this.tag = `Live2DModel(${this.internalModel.settings.name})`;
  }
  /**
   * A callback that observes {@link anchor}, invoked when the anchor's values have been changed.
   */
  onAnchorChange() {
    this.pivot.set(
      this.anchor.x * this.internalModel.width,
      this.anchor.y * this.internalModel.height
    );
  }
  /**
   * Shorthand to start a motion.
   * @param group - The motion group.
   * @param index - Index in the motion group.
   * @param priority - The priority to be applied. (0: No priority, 1: IDLE, 2:NORMAL, 3:FORCE) (default: 2)
   * ### OPTIONAL: `{name: value, ...}`
   * @param sound - The audio url to file or base64 content
   * @param volume - Volume of the sound (0-1) (default: 0.5)
   * @param expression - In case you want to mix up a expression while playing sound (bind with Model.expression())
   * @param resetExpression - Reset the expression to default after the motion is finished (default: true)
   * @return Promise that resolves with true if the motion is successfully started, with false otherwise.
   */
  motion(group, index, priority, {
    sound = void 0,
    volume = VOLUME,
    expression = void 0,
    resetExpression = true,
    crossOrigin,
    onFinish,
    onError
  } = {}) {
    return index === void 0 ? this.internalModel.motionManager.startRandomMotion(group, priority, {
      sound,
      volume,
      expression,
      resetExpression,
      crossOrigin,
      onFinish,
      onError
    }) : this.internalModel.motionManager.startMotion(group, index, priority, {
      sound,
      volume,
      expression,
      resetExpression,
      crossOrigin,
      onFinish,
      onError
    });
  }
  /**
   * Shorthand to start multiple motions in parallel.
   * @param motionList - The motion list: {
   *  group: The motion group,
   *  index: Index in the motion group,
   *  priority - The priority to be applied. (0: No priority, 1: IDLE, 2:NORMAL, 3:FORCE) (default: 2)
   * }[]
   * @return Promise that resolves with a list, indicates the motion is successfully started, with false otherwise.
   */
  parallelMotion(motionList) {
    return __async(this, null, function* () {
      this.internalModel.extendParallelMotionManager(motionList.length);
      const result = motionList.map((m, idx) => {
        var _a;
        return (_a = this.internalModel.parallelMotionManager[idx]) == null ? void 0 : _a.startMotion(m.group, m.index, m.priority);
      });
      let flags = [];
      for (let r of result) {
        flags.push(yield r);
      }
      return flags;
    });
  }
  /**
   * Stops all playing motions as well as the sound.
   */
  stopMotions() {
    return this.internalModel.motionManager.stopAllMotions();
  }
  /**
   * Shorthand to start speaking a sound with an expression.
   * @param sound - The audio url to file or base64 content
   * ### OPTIONAL: {name: value, ...}
   * @param volume - Volume of the sound (0-1)
   * @param expression - In case you want to mix up a expression while playing sound (bind with Model.expression())
   * @param resetExpression - Reset the expression to default after the motion is finished (default: true)
   * @returns Promise that resolves with true if the sound is playing, false if it's not
   */
  speak(sound, {
    volume = VOLUME,
    expression,
    resetExpression = true,
    crossOrigin,
    onFinish,
    onError
  } = {}) {
    return this.internalModel.motionManager.speak(sound, {
      volume,
      expression,
      resetExpression,
      crossOrigin,
      onFinish,
      onError
    });
  }
  /**
   * Stop current audio playback and lipsync
   */
  stopSpeaking() {
    return this.internalModel.motionManager.stopSpeaking();
  }
  /**
   * Shorthand to set an expression.
   * @param id - Either the index, or the name of the expression. If not presented, a random expression will be set.
   * @return Promise that resolves with true if succeeded, with false otherwise.
   */
  expression(id) {
    if (this.internalModel.motionManager.expressionManager) {
      return id === void 0 ? this.internalModel.motionManager.expressionManager.setRandomExpression() : this.internalModel.motionManager.expressionManager.setExpression(id);
    }
    return Promise.resolve(false);
  }
  /**
   * Updates the focus position. This will not cause the model to immediately look at the position,
   * instead the movement will be interpolated.
   * @param x - Position in world space.
   * @param y - Position in world space.
   * @param instant - Should the focus position be instantly applied.
   */
  focus(x, y, instant = false) {
    tempPoint.x = x;
    tempPoint.y = y;
    this.toModelPosition(tempPoint, tempPoint, true);
    const tx = tempPoint.x / this.internalModel.originalWidth * 2 - 1;
    const ty = tempPoint.y / this.internalModel.originalHeight * 2 - 1;
    const radian = Math.atan2(ty, tx);
    this.internalModel.focusController.focus(Math.cos(radian), -Math.sin(radian), instant);
  }
  /**
   * Tap on the model. This will perform a hit-testing, and emit a "hit" event
   * if at least one of the hit areas is hit.
   * @param x - Position in world space.
   * @param y - Position in world space.
   * @emits {@link Live2DModelEvents.hit}
   */
  tap(x, y) {
    const hitAreaNames = this.hitTest(x, y);
    if (hitAreaNames.length) {
      logger.log(this.tag, `Hit`, hitAreaNames);
      this.emit("hit", hitAreaNames);
    }
  }
  /**
   * Hit-test on the model.
   * @param x - Position in world space.
   * @param y - Position in world space.
   * @return The names of the *hit* hit areas. Can be empty if none is hit.
   */
  hitTest(x, y) {
    tempPoint.x = x;
    tempPoint.y = y;
    this.toModelPosition(tempPoint, tempPoint);
    return this.internalModel.hitTest(tempPoint.x, tempPoint.y);
  }
  /**
   * Calculates the position in the canvas of original, unscaled Live2D model.
   * @param position - A Point in world space.
   * @param result - A Point to store the new value. Defaults to a new Point.
   * @param skipUpdate - True to skip the update transform.
   * @return The Point in model canvas space.
   */
  toModelPosition(position, result = position.clone(), skipUpdate) {
    if (!skipUpdate) {
      this._recursivePostUpdateTransform();
      if (!this.parent) {
        this.parent = this._tempDisplayObjectParent;
        this.displayObjectUpdateTransform();
        this.parent = null;
      } else {
        this.displayObjectUpdateTransform();
      }
    }
    this.transform.worldTransform.applyInverse(position, result);
    this.internalModel.localTransform.applyInverse(result, result);
    return result;
  }
  /**
   * A method required by `PIXI.InteractionManager` to perform hit-testing.
   * @param point - A Point in world space.
   * @return True if the point is inside this model.
   */
  containsPoint(point) {
    return this.getBounds(true).contains(point.x, point.y);
  }
  /** @override */
  _calculateBounds() {
    this._bounds.addFrame(
      this.transform,
      0,
      0,
      this.internalModel.width,
      this.internalModel.height
    );
  }
  /**
   * Updates the model. Note this method just updates the timer,
   * and the actual update will be done right before rendering the model.
   * @param dt - The elapsed time in milliseconds since last frame.
   */
  update(dt) {
    this.deltaTime += dt;
    this.elapsedTime += dt;
  }
  _render(renderer) {
    renderer.batch.reset();
    renderer.geometry.reset();
    renderer.shader.reset();
    renderer.state.reset();
    let shouldUpdateTexture = false;
    if (this.glContextID !== renderer.CONTEXT_UID) {
      this.glContextID = renderer.CONTEXT_UID;
      this.internalModel.updateWebGLContext(renderer.gl, this.glContextID);
      shouldUpdateTexture = true;
    }
    for (let i = 0; i < this.textures.length; i++) {
      const texture = this.textures[i];
      if (!texture.valid) {
        continue;
      }
      if (shouldUpdateTexture || !texture.baseTexture._glTextures[this.glContextID]) {
        renderer.gl.pixelStorei(
          WebGLRenderingContext.UNPACK_FLIP_Y_WEBGL,
          this.internalModel.textureFlipY
        );
        renderer.texture.bind(texture.baseTexture, 0);
      }
      this.internalModel.bindTexture(
        i,
        texture.baseTexture._glTextures[this.glContextID].texture
      );
      texture.baseTexture.touched = renderer.textureGC.count;
    }
    const viewport = renderer.framebuffer.viewport;
    this.internalModel.viewport = [viewport.x, viewport.y, viewport.width, viewport.height];
    if (this.deltaTime) {
      this.internalModel.update(this.deltaTime, this.elapsedTime);
      this.deltaTime = 0;
    }
    const internalTransform = tempMatrix.copyFrom(renderer.globalUniforms.uniforms.projectionMatrix).append(this.worldTransform);
    this.internalModel.updateTransform(internalTransform);
    this.internalModel.draw(renderer.gl);
    renderer.state.reset();
    renderer.texture.reset();
  }
  /**
   * Destroys the model and all related resources. This takes the same options and also
   * behaves the same as `PIXI.Container#destroy`.
   * @param options - Options parameter. A boolean will act as if all options
   *  have been set to that value
   * @param [options.children=false] - if set to true, all the children will have their destroy
   *  method called as well. 'options' will be passed on to those calls.
   * @param [options.texture=false] - Only used for child Sprites if options.children is set to true
   *  Should it destroy the texture of the child sprite
   * @param [options.baseTexture=false] - Only used for child Sprites if options.children is set to true
   *  Should it destroy the base texture of the child sprite
   */
  destroy(options) {
    this.emit("destroy");
    if (options == null ? void 0 : options.texture) {
      this.textures.forEach((texture) => texture.destroy(options.baseTexture));
    }
    this.automator.destroy();
    this.internalModel.destroy();
    super.destroy(options);
  }
}
if (!window.Live2D) {
  throw new Error(
    "Could not find Cubism 2 runtime. This plugin requires live2d.min.js to be loaded."
  );
}
const originalUpdateParam = Live2DMotion.prototype.updateParam;
Live2DMotion.prototype.updateParam = function(model, entry) {
  originalUpdateParam.call(this, model, entry);
  if (entry.isFinished() && this.onFinishHandler) {
    this.onFinishHandler(this);
    delete this.onFinishHandler;
  }
};
class Live2DExpression extends AMotion {
  constructor(json) {
    super();
    __publicField(this, "params", []);
    this.setFadeIn(json.fade_in > 0 ? json.fade_in : config.expressionFadingDuration);
    this.setFadeOut(json.fade_out > 0 ? json.fade_out : config.expressionFadingDuration);
    if (Array.isArray(json.params)) {
      json.params.forEach((param) => {
        const calc = param.calc || "add";
        if (calc === "add") {
          const defaultValue = param.def || 0;
          param.val -= defaultValue;
        } else if (calc === "mult") {
          const defaultValue = param.def || 1;
          param.val /= defaultValue;
        }
        this.params.push({
          calc,
          val: param.val,
          id: param.id
        });
      });
    }
  }
  /** @override */
  updateParamExe(model, time, weight, motionQueueEnt) {
    this.params.forEach((param) => {
      model.setParamFloat(param.id, param.val * weight);
    });
  }
}
class Cubism2ExpressionManager extends ExpressionManager {
  constructor(settings, options) {
    var _a;
    super(settings, options);
    __publicField(this, "queueManager", new MotionQueueManager());
    __publicField(this, "definitions");
    this.definitions = (_a = this.settings.expressions) != null ? _a : [];
    this.init();
  }
  isFinished() {
    return this.queueManager.isFinished();
  }
  getExpressionIndex(name) {
    return this.definitions.findIndex((def) => def.name === name);
  }
  getExpressionFile(definition) {
    return definition.file;
  }
  createExpression(data, definition) {
    return new Live2DExpression(data);
  }
  _setExpression(motion) {
    return this.queueManager.startMotion(motion);
  }
  stopAllExpressions() {
    this.queueManager.stopAllMotions();
  }
  updateParameters(model, dt) {
    return this.queueManager.updateParam(model);
  }
}
class Cubism2MotionManager extends MotionManager {
  constructor(settings, options) {
    super(settings, options);
    __publicField(this, "definitions");
    __publicField(this, "groups", { idle: "idle" });
    __publicField(this, "motionDataType", "arraybuffer");
    __publicField(this, "queueManager", new MotionQueueManager());
    __publicField(this, "lipSyncIds");
    __publicField(this, "expressionManager");
    this.definitions = this.settings.motions;
    this.init(options);
    this.lipSyncIds = ["PARAM_MOUTH_OPEN_Y"];
  }
  init(options) {
    super.init(options);
    if (this.settings.expressions) {
      this.expressionManager = new Cubism2ExpressionManager(this.settings, options);
    }
  }
  isFinished() {
    return this.queueManager.isFinished();
  }
  createMotion(data, group, definition) {
    const motion = Live2DMotion.loadMotion(data);
    const defaultFadingDuration = group === this.groups.idle ? config.idleMotionFadingDuration : config.motionFadingDuration;
    motion.setFadeIn(definition.fade_in > 0 ? definition.fade_in : defaultFadingDuration);
    motion.setFadeOut(definition.fade_out > 0 ? definition.fade_out : defaultFadingDuration);
    return motion;
  }
  getMotionFile(definition) {
    return definition.file;
  }
  getMotionName(definition) {
    return definition.file;
  }
  getSoundFile(definition) {
    return definition.sound;
  }
  _startMotion(motion, onFinish) {
    motion.onFinishHandler = onFinish;
    this.queueManager.stopAllMotions();
    return this.queueManager.startMotion(motion);
  }
  _stopAllMotions() {
    this.queueManager.stopAllMotions();
  }
  updateParameters(model, now) {
    return this.queueManager.updateParam(model);
  }
  destroy() {
    super.destroy();
    this.queueManager = void 0;
  }
}
class ParallelMotionManager extends utils$3.EventEmitter {
  constructor(settings, manager) {
    super();
    /**
     * Tag for logging.
     */
    __publicField(this, "tag");
    __publicField(this, "manager");
    /**
     * The ModelSettings reference.
     */
    __publicField(this, "settings");
    /**
     * Maintains the state of this MotionManager.
     */
    __publicField(this, "state", new MotionState());
    /**
     * Flags there's a motion playing.
     */
    __publicField(this, "playing", false);
    /**
     * Flags the instances has been destroyed.
     */
    __publicField(this, "destroyed", false);
    this.settings = settings;
    this.tag = `ParallelMotionManager(${settings.name})`;
    this.state.tag = this.tag;
    this.manager = manager;
  }
  /**
   * Starts a motion as given priority.
   * @param group - The motion group.
   * @param index - Index in the motion group.
   * @param priority - The priority to be applied. default: 2 (NORMAL)
   * ### OPTIONAL: {name: value, ...}
   * @param sound - The audio url to file or base64 content
   * @param volume - Volume of the sound (0-1)
   * @param expression - In case you want to mix up a expression while playing sound (bind with Model.expression())
   * @param resetExpression - Reset expression before and after playing sound (default: true)
   * @param crossOrigin - Cross origin setting.
   * @return Promise that resolves with true if the motion is successfully started, with false otherwise.
   */
  startMotion(_0, _1) {
    return __async(this, arguments, function* (group, index, priority = MotionPriority.NORMAL) {
      var _a;
      if (!this.state.reserve(group, index, priority)) {
        return false;
      }
      const definition = (_a = this.manager.definitions[group]) == null ? void 0 : _a[index];
      if (!definition) {
        return false;
      }
      const motion = yield this.manager.loadMotion(group, index);
      if (!this.state.start(motion, group, index, priority)) {
        return false;
      }
      logger.log(this.tag, "Start motion:", this.getMotionName(definition));
      this.emit("motionStart", group, index, void 0);
      this.playing = true;
      this._startMotion(motion);
      return true;
    });
  }
  /**
   * Starts a random Motion as given priority.
   * @param group - The motion group.
   * @param priority - The priority to be applied. (default: 1 `IDLE`)
   * ### OPTIONAL: {name: value, ...}
   * @param sound - The wav url file or base64 content+
   * @param volume - Volume of the sound (0-1) (default: 1)
   * @param expression - In case you want to mix up a expression while playing sound (name/index)
   * @param resetExpression - Reset expression before and after playing sound (default: true)
   * @return Promise that resolves with true if the motion is successfully started, with false otherwise.
   */
  startRandomMotion(group, priority) {
    return __async(this, null, function* () {
      const groupDefs = this.manager.definitions[group];
      if (groupDefs == null ? void 0 : groupDefs.length) {
        const availableIndices = [];
        for (let i = 0; i < groupDefs.length; i++) {
          if (this.manager.motionGroups[group][i] !== null && !this.state.isActive(group, i)) {
            availableIndices.push(i);
          }
        }
        if (availableIndices.length) {
          const index = availableIndices[Math.floor(Math.random() * availableIndices.length)];
          return this.startMotion(group, index, priority);
        }
      }
      return false;
    });
  }
  /**
   * Stops all playing motions as well as the sound.
   */
  stopAllMotions() {
    this._stopAllMotions();
    this.state.reset();
  }
  /**
   * Updates parameters of the core model.
   * @param model - The core model.
   * @param now - Current time in milliseconds.
   * @return True if the parameters have been actually updated.
   */
  update(model, now) {
    if (this.isFinished()) {
      if (this.playing) {
        this.playing = false;
        this.emit("motionFinish");
      }
      this.state.complete();
    }
    return this.updateParameters(model, now);
  }
  /**
   * Destroys the instance.
   * @emits {@link MotionManagerEvents.destroy}
   */
  destroy() {
    this.destroyed = true;
    this.emit("destroy");
    this.stopAllMotions();
  }
}
class Cubism2ParallelMotionManager extends ParallelMotionManager {
  constructor(settings, manager) {
    super(settings, manager);
    __publicField(this, "queueManager", new MotionQueueManager());
  }
  isFinished() {
    return this.queueManager.isFinished();
  }
  getMotionName(definition) {
    return definition.file;
  }
  _startMotion(motion, onFinish) {
    motion.onFinishHandler = onFinish;
    this.queueManager.stopAllMotions();
    return this.queueManager.startMotion(motion);
  }
  _stopAllMotions() {
    this.queueManager.stopAllMotions();
  }
  updateParameters(model, now) {
    return this.queueManager.updateParam(model);
  }
  destroy() {
    super.destroy();
    this.queueManager = void 0;
  }
}
class Live2DEyeBlink {
  constructor(coreModel) {
    __publicField(this, "leftParam");
    __publicField(this, "rightParam");
    __publicField(this, "blinkInterval", 4e3);
    __publicField(this, "closingDuration", 100);
    __publicField(this, "closedDuration", 50);
    __publicField(this, "openingDuration", 150);
    __publicField(this, "eyeState", 0);
    __publicField(this, "eyeParamValue", 1);
    __publicField(this, "closedTimer", 0);
    __publicField(this, "nextBlinkTimeLeft", this.blinkInterval);
    this.coreModel = coreModel;
    this.leftParam = coreModel.getParamIndex("PARAM_EYE_L_OPEN");
    this.rightParam = coreModel.getParamIndex("PARAM_EYE_R_OPEN");
  }
  setEyeParams(value) {
    this.eyeParamValue = clamp(value, 0, 1);
    this.coreModel.setParamFloat(this.leftParam, this.eyeParamValue);
    this.coreModel.setParamFloat(this.rightParam, this.eyeParamValue);
  }
  update(dt) {
    switch (this.eyeState) {
      case 0:
        this.nextBlinkTimeLeft -= dt;
        if (this.nextBlinkTimeLeft < 0) {
          this.eyeState = 1;
          this.nextBlinkTimeLeft = this.blinkInterval + this.closingDuration + this.closedDuration + this.openingDuration + rand(0, 2e3);
        }
        break;
      case 1:
        this.setEyeParams(this.eyeParamValue + dt / this.closingDuration);
        if (this.eyeParamValue <= 0) {
          this.eyeState = 2;
          this.closedTimer = 0;
        }
        break;
      case 2:
        this.closedTimer += dt;
        if (this.closedTimer >= this.closedDuration) {
          this.eyeState = 3;
        }
        break;
      case 3:
        this.setEyeParams(this.eyeParamValue + dt / this.openingDuration);
        if (this.eyeParamValue >= 1) {
          this.eyeState = 0;
        }
    }
  }
}
const tempMatrixArray = new Float32Array([
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1
]);
class Cubism2InternalModel extends InternalModel {
  constructor(coreModel, settings, options) {
    super();
    __publicField(this, "settings");
    __publicField(this, "options");
    __publicField(this, "coreModel");
    __publicField(this, "motionManager");
    __publicField(this, "parallelMotionManager");
    __publicField(this, "eyeBlink");
    // parameter indices, cached for better performance
    __publicField(this, "eyeballXParamIndex");
    __publicField(this, "eyeballYParamIndex");
    __publicField(this, "angleXParamIndex");
    __publicField(this, "angleYParamIndex");
    __publicField(this, "angleZParamIndex");
    __publicField(this, "bodyAngleXParamIndex");
    __publicField(this, "breathParamIndex");
    // mouthFormIndex: number;
    __publicField(this, "textureFlipY", true);
    __publicField(this, "lipSync", true);
    /**
     * Number of the drawables in this model.
     */
    __publicField(this, "drawDataCount", 0);
    /**
     * If true, the face culling will always be disabled when drawing the model,
     * regardless of the model's internal flags.
     */
    __publicField(this, "disableCulling", false);
    __publicField(this, "hasDrawn", false);
    this.coreModel = coreModel;
    this.settings = settings;
    this.options = Object.assign({}, { breathDepth: 1 }, options);
    this.motionManager = new Cubism2MotionManager(settings, options);
    this.parallelMotionManager = [];
    this.eyeBlink = new Live2DEyeBlink(coreModel);
    this.eyeballXParamIndex = coreModel.getParamIndex("PARAM_EYE_BALL_X");
    this.eyeballYParamIndex = coreModel.getParamIndex("PARAM_EYE_BALL_Y");
    this.angleXParamIndex = coreModel.getParamIndex("PARAM_ANGLE_X");
    this.angleYParamIndex = coreModel.getParamIndex("PARAM_ANGLE_Y");
    this.angleZParamIndex = coreModel.getParamIndex("PARAM_ANGLE_Z");
    this.bodyAngleXParamIndex = coreModel.getParamIndex("PARAM_BODY_ANGLE_X");
    this.breathParamIndex = coreModel.getParamIndex("PARAM_BREATH");
    this.init();
  }
  init() {
    super.init();
    if (this.settings.initParams) {
      this.settings.initParams.forEach(
        ({ id, value }) => this.coreModel.setParamFloat(id, value)
      );
    }
    if (this.settings.initOpacities) {
      this.settings.initOpacities.forEach(
        ({ id, value }) => this.coreModel.setPartsOpacity(id, value)
      );
    }
    this.coreModel.saveParam();
    const arr = this.coreModel.getModelContext()._$aS;
    if (arr == null ? void 0 : arr.length) {
      this.drawDataCount = arr.length;
    }
    let culling = this.coreModel.drawParamWebGL.culling;
    Object.defineProperty(this.coreModel.drawParamWebGL, "culling", {
      set: (v) => culling = v,
      // always return false when disabled
      get: () => this.disableCulling ? false : culling
    });
    const clipManager = this.coreModel.getModelContext().clipManager;
    const originalSetupClip = clipManager.setupClip;
    clipManager.setupClip = (modelContext, drawParam) => {
      originalSetupClip.call(clipManager, modelContext, drawParam);
      drawParam.gl.viewport(...this.viewport);
    };
  }
  getSize() {
    return [this.coreModel.getCanvasWidth(), this.coreModel.getCanvasHeight()];
  }
  getLayout() {
    const layout = {};
    if (this.settings.layout) {
      for (const [key, value] of Object.entries(this.settings.layout)) {
        let commonKey = key;
        if (key === "center_x") {
          commonKey = "centerX";
        } else if (key === "center_y") {
          commonKey = "centerY";
        }
        layout[commonKey] = value;
      }
    }
    return layout;
  }
  updateWebGLContext(gl, glContextID) {
    const drawParamWebGL = this.coreModel.drawParamWebGL;
    drawParamWebGL.firstDraw = true;
    drawParamWebGL.setGL(gl);
    drawParamWebGL.glno = glContextID;
    for (const [key, value] of Object.entries(drawParamWebGL)) {
      if (value instanceof WebGLBuffer) {
        drawParamWebGL[key] = null;
      }
    }
    const clipManager = this.coreModel.getModelContext().clipManager;
    clipManager.curFrameNo = glContextID;
    const framebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    clipManager.getMaskRenderTexture();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  }
  bindTexture(index, texture) {
    this.coreModel.setTexture(index, texture);
  }
  getHitAreaDefs() {
    var _a;
    return ((_a = this.settings.hitAreas) == null ? void 0 : _a.map((hitArea) => ({
      id: hitArea.id,
      name: hitArea.name,
      index: this.coreModel.getDrawDataIndex(hitArea.id)
    }))) || [];
  }
  getDrawableIDs() {
    const modelContext = this.coreModel.getModelContext();
    const ids = [];
    for (let i = 0; i < this.drawDataCount; i++) {
      const drawData = modelContext.getDrawData(i);
      if (drawData) {
        ids.push(drawData.getDrawDataID().id);
      }
    }
    return ids;
  }
  getDrawableIndex(id) {
    return this.coreModel.getDrawDataIndex(id);
  }
  getDrawableVertices(drawIndex) {
    if (typeof drawIndex === "string") {
      drawIndex = this.coreModel.getDrawDataIndex(drawIndex);
      if (drawIndex === -1)
        throw new TypeError("Unable to find drawable ID: " + drawIndex);
    }
    return this.coreModel.getTransformedPoints(drawIndex).slice();
  }
  hitTest(x, y) {
    if (!this.hasDrawn) {
      logger.warn(
        "Trying to hit-test a Cubism 2 model that has not been rendered yet. The result will always be empty since the draw data is not ready."
      );
    }
    return super.hitTest(x, y);
  }
  update(dt, now) {
    var _a, _b, _c, _d;
    super.update(dt, now);
    const model = this.coreModel;
    this.emit("beforeMotionUpdate");
    const motionUpdated0 = this.motionManager.update(model, now);
    const parallelMotionUpdated = this.parallelMotionManager.map((m) => m.update(model, now));
    const motionUpdated = motionUpdated0 || parallelMotionUpdated.reduce((prev, curr) => prev || curr, false);
    this.emit("afterMotionUpdate");
    model.saveParam();
    (_a = this.motionManager.expressionManager) == null ? void 0 : _a.update(model, now);
    if (!motionUpdated) {
      (_b = this.eyeBlink) == null ? void 0 : _b.update(dt);
    }
    this.updateFocus();
    this.updateNaturalMovements(dt, now);
    if (this.lipSync && this.motionManager.currentAudio) {
      let value = this.motionManager.mouthSync();
      let min_ = 0;
      const max_ = 1;
      const bias_weight = 1.2;
      const bias_power = 0.7;
      if (value > 0) {
        min_ = 0.4;
      }
      value = Math.pow(value, bias_power);
      value = clamp(value * bias_weight, min_, max_);
      for (let i = 0; i < this.motionManager.lipSyncIds.length; ++i) {
        this.coreModel.setParamFloat(
          this.coreModel.getParamIndex(this.motionManager.lipSyncIds[i]),
          value
        );
      }
    }
    (_c = this.physics) == null ? void 0 : _c.update(now);
    (_d = this.pose) == null ? void 0 : _d.update(dt);
    this.emit("beforeModelUpdate");
    model.update();
    model.loadParam();
  }
  updateFocus() {
    this.coreModel.addToParamFloat(this.eyeballXParamIndex, this.focusController.x);
    this.coreModel.addToParamFloat(this.eyeballYParamIndex, this.focusController.y);
    this.coreModel.addToParamFloat(this.angleXParamIndex, this.focusController.x * 30);
    this.coreModel.addToParamFloat(this.angleYParamIndex, this.focusController.y * 30);
    this.coreModel.addToParamFloat(
      this.angleZParamIndex,
      this.focusController.x * this.focusController.y * -30
    );
    this.coreModel.addToParamFloat(this.bodyAngleXParamIndex, this.focusController.x * 10);
  }
  updateNaturalMovements(dt, now) {
    const t = now / 1e3 * 2 * Math.PI;
    this.coreModel.addToParamFloat(this.angleXParamIndex, 15 * this.options.breathDepth * Math.sin(t / 6.5345) * 0.5);
    this.coreModel.addToParamFloat(this.angleYParamIndex, 8 * this.options.breathDepth * Math.sin(t / 3.5345) * 0.5);
    this.coreModel.addToParamFloat(this.angleZParamIndex, 10 * this.options.breathDepth * Math.sin(t / 5.5345) * 0.5);
    this.coreModel.addToParamFloat(this.bodyAngleXParamIndex, 4 * this.options.breathDepth * Math.sin(t / 15.5345) * 0.5);
    this.coreModel.setParamFloat(this.breathParamIndex, 0.5 + 0.5 * Math.sin(t / 3.2345));
  }
  draw(gl) {
    const disableCulling = this.disableCulling;
    if (gl.getParameter(gl.FRAMEBUFFER_BINDING)) {
      this.disableCulling = true;
    }
    const matrix = this.drawingMatrix;
    tempMatrixArray[0] = matrix.a;
    tempMatrixArray[1] = matrix.b;
    tempMatrixArray[4] = matrix.c;
    tempMatrixArray[5] = matrix.d;
    tempMatrixArray[12] = matrix.tx;
    tempMatrixArray[13] = matrix.ty;
    this.coreModel.setMatrix(tempMatrixArray);
    this.coreModel.draw();
    this.hasDrawn = true;
    this.disableCulling = disableCulling;
  }
  extendParallelMotionManager(managerCount) {
    while (this.parallelMotionManager.length < managerCount) {
      this.parallelMotionManager.push(new Cubism2ParallelMotionManager(this.settings, this.motionManager));
    }
  }
  destroy() {
    super.destroy();
    this.coreModel = void 0;
  }
}
class Cubism2ModelSettings extends ModelSettings {
  constructor(json) {
    super(json);
    // files
    __publicField(this, "moc");
    __publicField(this, "textures");
    // metadata
    __publicField(this, "layout");
    __publicField(this, "hitAreas");
    __publicField(this, "initParams");
    __publicField(this, "initOpacities");
    // motions
    __publicField(this, "expressions");
    __publicField(this, "motions", {});
    if (!Cubism2ModelSettings.isValidJSON(json)) {
      throw new TypeError("Invalid JSON.");
    }
    this.moc = json.model;
    copyArray("string", json, this, "textures", "textures");
    this.copy(json);
  }
  /**
   * Checks if a JSON object is valid model settings.
   * @param json
   */
  static isValidJSON(json) {
    var _a;
    return !!json && typeof json.model === "string" && ((_a = json.textures) == null ? void 0 : _a.length) > 0 && // textures must be an array of strings
    json.textures.every((item) => typeof item === "string");
  }
  /**
   * Validates and copies *optional* properties from raw JSON.
   */
  copy(json) {
    copyProperty("string", json, this, "name", "name");
    copyProperty("string", json, this, "pose", "pose");
    copyProperty("string", json, this, "physics", "physics");
    copyProperty("object", json, this, "layout", "layout");
    copyProperty("object", json, this, "motions", "motions");
    copyArray("object", json, this, "hit_areas", "hitAreas");
    copyArray("object", json, this, "expressions", "expressions");
    copyArray("object", json, this, "init_params", "initParams");
    copyArray("object", json, this, "init_opacities", "initOpacities");
  }
  replaceFiles(replace2) {
    super.replaceFiles(replace2);
    for (const [group, motions] of Object.entries(this.motions)) {
      for (let i = 0; i < motions.length; i++) {
        motions[i].file = replace2(motions[i].file, `motions.${group}[${i}].file`);
        if (motions[i].sound !== void 0) {
          motions[i].sound = replace2(motions[i].sound, `motions.${group}[${i}].sound`);
        }
      }
    }
    if (this.expressions) {
      for (let i = 0; i < this.expressions.length; i++) {
        this.expressions[i].file = replace2(
          this.expressions[i].file,
          `expressions[${i}].file`
        );
      }
    }
  }
}
const SRC_TYPE_MAP = {
  x: PhysicsHair.Src.SRC_TO_X,
  y: PhysicsHair.Src.SRC_TO_Y,
  angle: PhysicsHair.Src.SRC_TO_G_ANGLE
};
const TARGET_TYPE_MAP = {
  x: PhysicsHair.Src.SRC_TO_X,
  y: PhysicsHair.Src.SRC_TO_Y,
  angle: PhysicsHair.Src.SRC_TO_G_ANGLE
};
class Live2DPhysics {
  constructor(coreModel, json) {
    __publicField(this, "physicsHairs", []);
    this.coreModel = coreModel;
    if (json.physics_hair) {
      this.physicsHairs = json.physics_hair.map((definition) => {
        const physicsHair = new PhysicsHair();
        physicsHair.setup(
          definition.setup.length,
          definition.setup.regist,
          definition.setup.mass
        );
        definition.src.forEach(({ id, ptype, scale, weight }) => {
          const type2 = SRC_TYPE_MAP[ptype];
          if (type2) {
            physicsHair.addSrcParam(type2, id, scale, weight);
          }
        });
        definition.targets.forEach(({ id, ptype, scale, weight }) => {
          const type2 = TARGET_TYPE_MAP[ptype];
          if (type2) {
            physicsHair.addTargetParam(type2, id, scale, weight);
          }
        });
        return physicsHair;
      });
    }
  }
  update(elapsed) {
    this.physicsHairs.forEach((physicsHair) => physicsHair.update(this.coreModel, elapsed));
  }
}
class Live2DPartsParam {
  constructor(id) {
    __publicField(this, "paramIndex", -1);
    __publicField(this, "partsIndex", -1);
    __publicField(this, "link", []);
    this.id = id;
  }
  initIndex(model) {
    this.paramIndex = model.getParamIndex("VISIBLE:" + this.id);
    this.partsIndex = model.getPartsDataIndex(PartsDataID.getID(this.id));
    model.setParamFloat(this.paramIndex, 1);
  }
}
class Live2DPose {
  constructor(coreModel, json) {
    __publicField(this, "opacityAnimDuration", 500);
    __publicField(this, "partsGroups", []);
    this.coreModel = coreModel;
    if (json.parts_visible) {
      this.partsGroups = json.parts_visible.map(
        ({ group }) => group.map(({ id, link }) => {
          const parts = new Live2DPartsParam(id);
          if (link) {
            parts.link = link.map((l) => new Live2DPartsParam(l));
          }
          return parts;
        })
      );
      this.init();
    }
  }
  init() {
    this.partsGroups.forEach((group) => {
      group.forEach((parts) => {
        parts.initIndex(this.coreModel);
        if (parts.paramIndex >= 0) {
          const visible = this.coreModel.getParamFloat(parts.paramIndex) !== 0;
          this.coreModel.setPartsOpacity(parts.partsIndex, visible ? 1 : 0);
          this.coreModel.setParamFloat(parts.paramIndex, visible ? 1 : 0);
          if (parts.link.length > 0) {
            parts.link.forEach((p) => p.initIndex(this.coreModel));
          }
        }
      });
    });
  }
  normalizePartsOpacityGroup(partsGroup, dt) {
    const model = this.coreModel;
    const phi = 0.5;
    const maxBackOpacity = 0.15;
    let visibleOpacity = 1;
    let visibleIndex = partsGroup.findIndex(
      ({ paramIndex, partsIndex }) => partsIndex >= 0 && model.getParamFloat(paramIndex) !== 0
    );
    if (visibleIndex >= 0) {
      const originalOpacity = model.getPartsOpacity(partsGroup[visibleIndex].partsIndex);
      visibleOpacity = clamp(originalOpacity + dt / this.opacityAnimDuration, 0, 1);
    } else {
      visibleIndex = 0;
      visibleOpacity = 1;
    }
    partsGroup.forEach(({ partsIndex }, index) => {
      if (partsIndex >= 0) {
        if (visibleIndex == index) {
          model.setPartsOpacity(partsIndex, visibleOpacity);
        } else {
          let opacity = model.getPartsOpacity(partsIndex);
          let a1;
          if (visibleOpacity < phi) {
            a1 = visibleOpacity * (phi - 1) / phi + 1;
          } else {
            a1 = (1 - visibleOpacity) * phi / (1 - phi);
          }
          const backOp = (1 - a1) * (1 - visibleOpacity);
          if (backOp > maxBackOpacity) {
            a1 = 1 - maxBackOpacity / (1 - visibleOpacity);
          }
          if (opacity > a1) {
            opacity = a1;
          }
          model.setPartsOpacity(partsIndex, opacity);
        }
      }
    });
  }
  copyOpacity(partsGroup) {
    const model = this.coreModel;
    partsGroup.forEach(({ partsIndex, link }) => {
      if (partsIndex >= 0 && link) {
        const opacity = model.getPartsOpacity(partsIndex);
        link.forEach(({ partsIndex: partsIndex2 }) => {
          if (partsIndex2 >= 0) {
            model.setPartsOpacity(partsIndex2, opacity);
          }
        });
      }
    });
  }
  update(dt) {
    this.partsGroups.forEach((partGroup) => {
      this.normalizePartsOpacityGroup(partGroup, dt);
      this.copyOpacity(partGroup);
    });
  }
}
Live2DFactory.registerRuntime({
  version: 2,
  test(source) {
    return source instanceof Cubism2ModelSettings || Cubism2ModelSettings.isValidJSON(source);
  },
  ready() {
    return Promise.resolve();
  },
  isValidMoc(modelData) {
    if (modelData.byteLength < 3) {
      return false;
    }
    const view = new Int8Array(modelData, 0, 3);
    return String.fromCharCode(...view) === "moc";
  },
  createModelSettings(json) {
    return new Cubism2ModelSettings(json);
  },
  createCoreModel(data) {
    const model = Live2DModelWebGL.loadModel(data);
    const error = Live2D.getError();
    if (error)
      throw error;
    return model;
  },
  createInternalModel(coreModel, settings, options) {
    return new Cubism2InternalModel(coreModel, settings, options);
  },
  createPose(coreModel, data) {
    return new Live2DPose(coreModel, data);
  },
  createPhysics(coreModel, data) {
    return new Live2DPhysics(coreModel, data);
  }
});
export {
  Cubism2ExpressionManager,
  Cubism2InternalModel,
  Cubism2ModelSettings,
  Cubism2MotionManager,
  ExpressionManager,
  FileLoader,
  FocusController,
  InternalModel,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  Live2DExpression,
  Live2DEyeBlink,
  Live2DFactory,
  Live2DLoader,
  Live2DModel,
  Live2DPhysics,
  Live2DPose,
  Live2DTransform,
  ModelSettings,
  MotionManager,
  MotionPreloadStrategy,
  MotionPriority,
  MotionState,
  SoundManager,
  VERSION,
  VOLUME,
  XHRLoader,
  ZipLoader,
  applyMixins,
  clamp,
  config,
  copyArray,
  copyProperty,
  folderName,
  logger,
  rand,
  remove
};
