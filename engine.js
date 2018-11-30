var KEY_COUNT = 255;

var KEY_UP = "ArrowUp";
var KEY_DOWN = "ArrowDown";
var KEY_LEFT = "ArrowLeft";
var KEY_RIGHT = "ArrowRight";
var KEY_Z = "KeyZ";
var KEY_X = "KeyX";
var KEY_SPACE = "Space";

var MOUSE_BUTTON_LEFT = 0;
var MOUSE_BUTTON_RIGHT = 1;
var MOUSE_BUTTON_MIDDLE = 2;
var MOUSE_BUTTON_FORWARD = 3;
var MOUSE_BUTTON_BACKWARD = 4;

var FONT_WEIGHT_NORMAL = "normal";
var FONT_WEIGHT_BOLD = "bold";
var FONT_STYLE_NONE = "none";
var FONT_STYLE_ITALIC = "italic";

var ALIGN_CENTRE = "centre";
var ALIGN_LEFT = "left";
var ALIGN_RIGHT = "right";
var ALIGN_TOP = "top";
var ALIGN_BOTTOM = "bottom";

var ENTITY_TYPE_PLAYER = 0;
var ENTITY_TYPE_PLAYER_BULLET = 1;
var ENTITY_TYPE_HAZARD = 2;
var ENTITY_TYPE_ENEMY = 3;
var ENTITY_TYPE_ENEMY_BULLET = 4;
var ENTITY_TYPE_BOMB = 5;

var ENEMY_STREAMER = 0;
var ENEMY_DIVER = 1;
var ENEMY_SPINNER = 2;
var ENEMY_BURSTER = 3;

var game, renderer, input, assets, ease;

//-----------------------------------------------------------------------------

Direction = {
    UP : 0,
    DOWN : 1,
    LEFT : 2,
    RIGHT : 3
};

//-----------------------------------------------------------------------------

Ease = {
    quadIn : function(t) {
		return t * t;
	},
	quadInOut : function(t) {
        if(t <= 0.5) {
            return 2.0 * t * t;
        }
        t -= 0.5;
        return 2.0 * t * (1.0 - t) + 0.5;
	}
};

//-----------------------------------------------------------------------------

function Texture(url, onLoad) {
    this.loaded = false;
    this.size = new Vector2();
    this.image = new Image();
    this.onLoad = onLoad;
    this.image.addEventListener('load', function() {
        this.size.set(this.image.width, this.image.height);
        this.loaded = true;
        if(this.onLoad) {
            this.onLoad();
        }
    }.bind(this), false);
    this.image.src = url;
}

//-----------------------------------------------------------------------------

function SpriteAnimation(name, frames, frameRate) {
    this.name = name;
    this.setFrames(frames);
    this.frameRate = frameRate;
}

SpriteAnimation.prototype.setFrames = function(frames) {
    this.frames = frames;
    this.length = this.frames.length;
}

//-----------------------------------------------------------------------------

function SpriteDefinition(texture, width, height) {
    this.texture = texture;
    this.size = new Vector2(width, height);
    this.origin = new Vector2(width * 0.5, height * 0.5);
    this.offset = new Vector2(-width * 0.5, -height * 0.5);
    this.animations = {};
}

SpriteDefinition.prototype.addAnimation = function(name, frames, frameRate) {
    this.animations[name] = new SpriteAnimation(name, frames, frameRate);
}

//-----------------------------------------------------------------------------

function Sprite(definition) {
    this.definition = definition;
    this.angle = 0;
    this.scale = new Vector2(1, 1);
    this.offset = new Vector2(definition.offset);
    this.origin = new Vector2(definition.origin);
    this.flip = new Vector2(false, false);
    this.visible = true;
    this.animation = null;
    this.frameRate = 0;
    this.frameTimer = 0;
    this.frame = 0;
}

Sprite.prototype.playAnimation = function(name, frameRate) {
    if(name) {
        this.animation = this.definition.animations[name];
        if(frameRate !== undefined) {
            this.frameRate = frameRate;
        } else {
            this.frameRate = this.animation.frameRate;
        }
    } else {
        this.animation = null;
    }
}

Sprite.prototype.update = function(deltaTime) {
    if(this.animation) {
        this.frameTimer += deltaTime * this.frameRate;
        if(this.frameTimer >= this.animation.length) {
            this.frameTimer -= this.animation.length;
            if(this.frameTimer >= this.animation.length) {
                this.frameTimer = 0;
            }
        }
        this.frame = this.animation.frames[~~this.frameTimer];
    }
}

//-----------------------------------------------------------------------------

function Json(url, onLoad) {
    this.loaded = false;
    this.data = null;
    this.request = new XMLHttpRequest();
    this.onLoad = onLoad;
    this.request.onreadystatechange = function() {
        if(this.request.readyState == 4 && this.request.status == 200) {
            try {
                var data = JSON.parse(this.request.responseText);
                this.loaded = true;
                this.data = data;
            } catch(error) {
                console.warn(error.message + " in " + this.request.responseText);
                this.loaded = true;
            }
            if(this.onLoad) {
                this.onLoad();
            }
        }
    }.bind(this);
 
    this.request.open("GET", url, true);
    this.request.send();
}

//-----------------------------------------------------------------------------

function Assets() {
    this.textures = {};
    this.json = {};
    this.onLoad = null;
}

Assets.prototype.checkLoaded = function() {
    var loaded = true;
    for(var key in this.textures) {
        if(!this.textures[key].loaded) {
            var loaded = false;
        }
    }
    if(loaded && this.onLoad) {
        var callback = this.onLoad;
        this.onLoad = null;
        callback();
    }
}

Assets.prototype.loadTexture = function(name, url) {
    this.textures[name] = new Texture(url, this.checkLoaded.bind(this));
}

Assets.prototype.getTexture = function(name) {
    return this.textures[name];
}

Assets.prototype.loadJson = function(name, url) {
    this.json[name] = new Json(url, this.checkLoaded.bind(this));
}

Assets.prototype.getJson = function(name) {
    if(this.json[name]) {
        return this.json[name].data;
    }
}

//-----------------------------------------------------------------------------

function Color(r, g, b, a) {
    if(typeof r == "string") {
        if(r.length == 7 && r.charAt(0) == '#') {
            var redHex = r.substring(1, 2);
            var greenHex = r.substring(3, 2);
            var blueHex = r.substring(5, 2);
            this.set(
                parseInt(redHex, 16) / 255,
                parseInt(greenHex, 16) / 255,
                parseInt(blueHex, 16) / 255
            );
        } else {
            console.error("Incorrectly formatted color: \"" + r + "\"");
        }
    } else {
        this.set(r, g, b, a);
    }
}

Color.prototype.toStyle = function() {
    return "rgba(" + (this.r * 255) + ", " + (this.g * 255) + ", " + (this.b * 255) + ", " + (this.a) + ")";
}

Color.prototype.set = function(r, g, b, a) {
    this.r = r !== undefined ? r : 1;
    this.g = g !== undefined ? g : 1;
    this.b = b !== undefined ? b : 1;
    this.a = a !== undefined ? a : 1;
    return this;
}

Color.prototype.clone = function() {
    return new Color(this.r, this.g, this.b, this.a);
}

Color.prototype.blend = function(other, amount) {
    this.r += (other.r - this.r) * amount;
    this.g += (other.g - this.g) * amount;
    this.b += (other.b - this.b) * amount;
    this.a += (other.a - this.a) * amount;
    return this;
}

Color.White = new Color(1, 1, 1, 1);
Color.Black = new Color(0, 0, 0, 1);

//-----------------------------------------------------------------------------

function Font() {
    this.size = 12;
    this.weight = FONT_WEIGHT_NORMAL;
    this.style = FONT_STYLE_NONE;
    this.family = "arial";
    this.horizontalAlign = ALIGN_LEFT;
    this.verticalAlign = ALIGN_TOP;
    this.outlineSize = 0;
    this.outlineColor = 0;
}

Font.Default = new Font();

Font.prototype.applyStyles = function() {
    var fontString = ""
    switch(this.style) {
        case FONT_STYLE_ITALIC:
            fontString += "italic ";
            break;
    }
    switch(this.weight) {
        case FONT_WEIGHT_BOLD:
            fontString += "bold ";
            break;
    }
    fontString += this.size + "px ";
    fontString += this.family + " ";
    renderer.ctx.font = fontString;

    switch(this.horizontalAlign) {
        case ALIGN_LEFT: renderer.ctx.textAlign = "left"; break;
        case ALIGN_RIGHT: renderer.ctx.textAlign = "right"; break;
        case ALIGN_CENTRE: renderer.ctx.textAlign = "center"; break;
        default: renderer.ctx.textAlign = "left"; break;
    }

    switch(this.verticalAlign) {
        case ALIGN_TOP: renderer.ctx.textBaseline = "top"; break;
        case ALIGN_BOTTOM: renderer.ctx.textBaseline = "bottom"; break;
        case ALIGN_CENTRE: renderer.ctx.textBaseline = "middle"; break;
        default: renderer.ctx.textBaseline = "top"; break;
    }
}

//-----------------------------------------------------------------------------

function Vector2(x, y) {
    this.set(x, y);
}

Vector2.prototype.set = function(x, y) {
    if(typeof x == "object") {
        this.x = x.x;
        this.y = x.y;
    } else {
        this.x = x;
        this.y = y;
    }
    return this;
}

Vector2.prototype.add = function(other) {
    this.x += other.x;
    this.y += other.y;
    return this;
}

Vector2.prototype.subtract = function(other) {
    this.x -= other.x;
    this.y -= other.y;
    return this;
}

Vector2.prototype.multiply = function(other) {
    this.x *= other.x;
    this.y *= other.y;
    return this;
}

Vector2.prototype.divide = function(other) {
    this.x /= other.x;
    this.y /= other.y;
    return this;
}

Vector2.prototype.scale = function(value) {
    this.x *= value;
    this.y *= value;
    return this;
}

Vector2.prototype.clone = function() {
    return new Vector2(this.x, this.y);
}

Vector2.prototype.dot = function(other) {
    return this.x * other.x + this.y * other.y;
}

Vector2.prototype.distance = function(other) {
    var dx = this.x - other.x;
    var dy = this.y - other.y;
    return Math.sqrt((dx * dx) + (dy * dy));
}

Vector2.prototype.direction = function(other) {
    var dx = other.x - this.x;
    var dy = other.y - this.y;
    return Math.atan2(-dy, dx);
}

Vector2.prototype.linearBlend = function(to, time) {
    var dx = to.x - this.x;
    var dy = to.y - this.y;
    this.x += dx * time;
    this.y += dy * time;
    return this;
}

//-----------------------------------------------------------------------------

function SortTree(sortFunction) {
    this.nodes = [];
    this.nodeCount = 0;
    this.rootNode = null;
}

SortTree.prototype.clear = function() {
    this.rootNode = null;
    this.nodeCount = 0;
}

SortTree.prototype.add = function(value, sortValue) {
    var node = this.nodes[this.nodeCount++];
    if(!node) {
        node = this.nodes[this.nodeCount - 1] = {};
    }

    node.value = value;
    node.sortValue = sortValue;
    node.greater = null;
    node.lesser = null;
    
    if(this.rootNode) {
        this.appendNodeToNode(this.rootNode, node);
    } else {
        this.rootNode = node;
    }
}

SortTree.prototype.appendNodeToNode = function(parent, child) {
    if(parent.sortValue < child.sortValue) {
        if(parent.greater) {
            this.appendNodeToNode(parent.greater, child);
        } else {
            parent.greater = child;
        }
    } else {
        if(parent.lesser) {
            this.appendNodeToNode(parent.lesser, child);
        } else {
            parent.lesser = child;
        }
    }
}

SortTree.prototype.forEach = function(callback) {
    this._forEach(this.rootNode, callback);
}

SortTree.prototype._forEach = function(node, callback) {
    if(node) {
        if(node.lesser) {
            this._forEach(node.lesser, callback);
        }
        callback(node.value);
        if(node.greater) {
            this._forEach(node.greater, callback);
        }
    }
}

//-----------------------------------------------------------------------------

function Renderer(width, height, actualWidth, actualHeight) {
    this.size = new Vector2(width, height);
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.autoSize = false;
    this.linearFiltering = true;
    this.divisibleAutoSize = false;
    if(!actualWidth || !actualHeight) {
        this.autoSize = true;
        this.resizeToFit();
        window.addEventListener("resize", this.resizeToFit.bind(this));
    } else {
        this.canvas.width = actualWidth;
        this.canvas.height = actualHeight;
        this.ctx.scale(actualWidth / width, actualHeight / height);
        this.ctx.save();
    }
    this.renderTree = new SortTree();
    this.clearColor = new Color(0.1, 0.1, 0.1);
}

Renderer.prototype.setDivisibleAutoSize = function(value) {
    this.divisibleAutoSize = value;
    this.resizeToFit();
}

Renderer.prototype.setLinearFiltering = function(value) {
    this.linearFiltering = value;
    this.ctx.imageSmoothingEnabled = this.linearFiltering;
}

Renderer.prototype.resizeToFit = function() {
    var aspect = this.size.y / this.size.x;
    var width = window.innerWidth;
    var height = window.innerHeight;
    if(width * aspect < height) {
        height = width * aspect;
    } else {
        width = height / aspect;
    }
    if(this.divisibleAutoSize) {
        width = width - (width % this.size.x);
        height = width * aspect;
    }
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = this.linearFiltering;
    this.ctx.restore();
    this.ctx.scale(width / this.size.x, height / this.size.y);
    this.ctx.save();
}

Renderer.prototype.placeInElement = function(element) {
    element.appendChild(this.canvas);
}

Renderer.prototype.begin = function() {
    this.clear();
    this.renderTree.clear();
}

Renderer.prototype.end = function() {
    this.renderTree.forEach(function(item) {
        item.function.apply(this, item.arguments);
    }.bind(this));
}

Renderer.prototype.clear = function() {
    this._drawRectangle(0, 0, this.size.x, this.size.y, this.clearColor);
}

Renderer.prototype.save = function() {
    this.ctx.save();
}

Renderer.prototype.restore = function() {
    this.ctx.restore();
}

Renderer.prototype.scale = function(x, y) {
    this.ctx.scale(x, y);
}

Renderer.prototype.translate = function(x, y) {
    this.ctx.translate(x, y);
}

Renderer.prototype.drawRectangle = function(x, y, width, height, color, depth) {
    this.renderTree.add({ function : this._drawRectangle, arguments : arguments}, depth ? -depth : 0);
}

Renderer.prototype._drawRectangle = function(x, y, width, height, color) {
    this.ctx.fillStyle = color.toStyle();
    this.ctx.fillRect(x, y, width, height);
}

Renderer.prototype.drawCircle = function(x, y, radius, color, depth) {
    this.renderTree.add({ function : this._drawCircle, arguments : arguments}, depth ? -depth : 0);
}

Renderer.prototype._drawCircle = function(x, y, radius, color) {
    this.ctx.fillStyle = color.toStyle();
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
}

Renderer.prototype.drawTexture = function(x, y, texture, depth) {
    this.renderTree.add({ function : this._drawTexture, arguments : arguments}, depth ? -depth : 0);
}

Renderer.prototype._drawTexture = function(x, y, texture) {
    if(texture.loaded) {
        this.ctx.drawImage(texture.image, x, y);
    }
}

Renderer.prototype.drawTextureScaled = function(x, y, texture, scaleX, scaleY, originX, originY, depth) {
    this.renderTree.add({ function : this._drawTextureScaled, arguments : arguments}, depth ? -depth : 0);
}

Renderer.prototype._drawTextureScaled = function(x, y, texture, scaleX, scaleY, originX, originY) {
    if(texture.loaded) {
        this.ctx.save();
        this.ctx.translate(x + originX, y + originY);
        this.ctx.scale(scaleX, scaleY);
        this.ctx.translate(-(x + originX), -(y + originY));
        this.ctx.drawImage(texture.image, x, y);
        this.ctx.restore();
    }
}

Renderer.prototype.drawTextureRotated = function(x, y, texture, angle, originX, originY, depth) {
    this.renderTree.add({ function : this._drawTextureRotated, arguments : arguments}, depth ? -depth : 0);
}

Renderer.prototype._drawTextureRotated = function(x, y, texture, angle, originX, originY) {
    if(texture.loaded) {
        this.ctx.save();
        this.ctx.translate(x + originX, y + originY);
        this.ctx.rotate(angle);
        this.ctx.translate(-(x + originX), -(y + originY));
        this.ctx.drawImage(texture.image, x, y);
        this.ctx.restore();
    }
}

Renderer.prototype.drawSprite = function(x, y, sprite, depth) {
    this.renderTree.add({ function : this._drawSprite, arguments : arguments}, depth ? -depth : 0);
}

Renderer.prototype._drawSprite = function(x, y, sprite) {
    if(sprite.visible && sprite.definition.texture && sprite.definition.texture.loaded) {
        var width = sprite.definition.size.x;
        var height = sprite.definition.size.y;
        var texture = sprite.definition.texture;
        var frameX = (sprite.frame * width) % texture.size.x;
        var frameY = (~~((sprite.frame * width) / texture.size.x)) * height;
        var scaleX = sprite.scale.x * (sprite.flip.x ? -1 : 1);
        var scaleY = sprite.scale.y * (sprite.flip.y ? -1 : 1);

        this.ctx.save();
        this.ctx.translate((x + sprite.origin.x + sprite.offset.x), (y + sprite.origin.y + sprite.offset.y));
        this.ctx.scale(scaleX, scaleY);
        this.ctx.rotate(sprite.angle);
        this.ctx.translate(-sprite.origin.x, -sprite.origin.y);
        this.ctx.drawImage(texture.image, frameX, frameY, width, height, 0, 0, width, height);
        this.ctx.restore();
    }
}

Renderer.prototype.drawParticleSystem = function(particleSystem, depth) {
    this.renderTree.add({ function : this._drawParticleSystem, arguments : arguments}, depth ? -depth : 0);
}

Renderer.prototype._drawParticleSystem = function(particleSystem) {
    particleSystem._draw();
}

Renderer.prototype.drawText = function(x, y, text, color, font, depth) {
    this.renderTree.add({ function : this._drawText, arguments : arguments}, depth ? -depth : 0);
}

Renderer.prototype._drawText = function(x, y, text, color, font) {
    var font = font ? font : Font.Default;
    font.applyStyles();
    if(font.outlineColor && font.outlineSize) {
        this.ctx.lineJoin = 'round';
        this.ctx.miterLimit = 2;
        this.ctx.strokeStyle = font.outlineColor.toStyle();
        this.ctx.lineWidth = font.outlineSize;
        this.ctx.strokeText(text, x, y);
    }
    this.ctx.fillStyle = color.toStyle();
    this.ctx.fillText(text, x, y);
}

//-----------------------------------------------------------------------------

function Input(renderer) {
    this.renderer = renderer;
    this.keys = {};
    this.keysPressed = {};
    this.keysReleased = {};
    this.mouseButtons = {};
    this.mouseButtonsPressed = {};
    this.mouseButtonsReleased = {};
    this.mousePosition = new Vector2();
    this.mouseDragging = false;
    this.mouseDragOrigin = new Vector2();
    this.mouseDragDistance = new Vector2();

    document.addEventListener("keydown", function(event) {
        if(!event.repeat) {
            this.keys[event.code] = true;
            this.keysPressed[event.code] = true;
        }
    }.bind(this));

    document.addEventListener("keyup", function(event) {
        this.keys[event.code] = false;
        this.keysReleased[event.code] = true;
    }.bind(this));

    window.addEventListener("mousedown", function(event) {
        this.mouseButtons[event.button] = true;
        this.mouseButtonsPressed[event.button] = true;
        this.mouseDragging = true;
    }.bind(this));

    window.addEventListener("mousemove", function(event) {
        var canvasBounds = this.renderer.canvas.getBoundingClientRect();
        var x = ((event.clientX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left)) * renderer.size.x;
        var y = ((event.clientY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top)) * renderer.size.y;
        this.mousePosition.set(x, y);
    }.bind(this));

    window.addEventListener("mouseup", function(event) {
        this.mouseButtons[event.button] = false;
        this.mouseButtonsReleased[event.button] = true;
        this.mouseDragging = false;
    }.bind(this));
}

Input.prototype.endFrame = function() {
    for(var key in this.keysPressed) {
        this.keysPressed[key] = false;
    }
    for(var key in this.keysReleased) {
        this.keysReleased[key] = false;
    }
    for(var button in this.mouseButtonsPressed) {
        this.mouseButtonsPressed[button] = false;
    }
    for(var button in this.mouseButtonsReleased) {
        this.mouseButtonsReleased[button] = false;
    }
}

Input.prototype.checkKey = function(key) {
    return this.keys[key] == true;
}

Input.prototype.checkKeyPressed = function(key) {
    return this.keysPressed[key] == true;
}

Input.prototype.checkKeyReleased = function(key) {
    return this.keysReleased[key] == true;
}

Input.prototype.checkMouse = function(button) {
    return this.mouseButtons[button] == true;
}

Input.prototype.checkMousePressed = function(button) {
    return this.mouseButtonsPressed[button] == true;
}

Input.prototype.checkMouseReleased = function(button) {
    return this.mouseButtonsReleased[button] == true;
}

//-----------------------------------------------------------------------------

function MessageSystem() {
    this.messages = [];
    this.currentMessage = null;
    this.animationTimer = 0;
    this.animationDuration = 0;
    this.font = new Font();
    this.font.size = 48;
    this.font.verticalAlign = ALIGN_CENTRE;
    this.font.horizontalAlign = ALIGN_CENTRE;
}

MessageSystem.prototype.add = function(message) {
    this.messages.push(message);
}

MessageSystem.prototype.update = function(deltaTime) {
    if(this.messages.length > 0 && !this.currentMessage) {
        this.currentMessage = this.messages.shift();
    }
    if(input.checkKeyPressed(KEY_Z)) {
        if(this.messages.length > 0) {
            this.currentMessage = this.messages.shift();
        } else {
            this.currentMessage = null;
        }
    }
}

MessageSystem.prototype.isActive = function() {
    return this.currentMessage !== null ? true : false;
}

MessageSystem.prototype.draw = function() {
    if(this.currentMessage) {
        renderer.drawText(renderer.size.x * 0.5, renderer.size.y * 0.5, this.currentMessage, Color.White, this.font);
    }
}

//-----------------------------------------------------------------------------

function EaseItem(easeFunction, from, to, duration, object, key, easeSystem) {
    this.timer = 0;
    this.from = from;
    this.to = to;
    this.easeFunction = easeFunction;
    this.duration = duration;
    this.done = false;
    this.object = object;
    this.key = key;
    this.lastAddedItem = null;
    this.easeSystem = easeSystem;
    this.next = null;
}

EaseItem.prototype.update = function(deltaTime) {
    this.timer += deltaTime;
    if(this.timer > this.duration && !this.done) {
        this.timer = this.duration;
        this.done = true;
        if(this.next) {
            this.easeSystem.items.push(this.next);
        }
    }
    this.object[this.key] = this.getValue();
}

EaseItem.prototype.getValue = function() {
    var delta = this.to - this.from;
    return this.easeFunction(this.timer / this.duration) * delta + this.from;
}

EaseItem.prototype.chain = function(easeFunction, from, to, duration, object, key) {
    if(this.next) {
        this.next.chain(easeFunction, from, to, duration, object, key);
    } else {
        this.next = new EaseItem(easeFunction, from, to, duration, object, key, this);
    }
}

//-----------------------------------------------------------------------------

function EaseSystem() {
    this.items = [];
}

EaseSystem.prototype.add = function(easeFunction, from, to, duration, object, key) {
    this.lastAddedItem = new EaseItem(easeFunction, from, to, duration, object, key, this);
    this.items.push(this.lastAddedItem);
    return this.lastAddedItem;
}

EaseSystem.prototype.chain = function(easeFunction, from, to, duration, object, key) {
    if(this.lastAddedItem) {
        this.lastAddedItem.next = new EaseItem(easeFunction, from, to, duration, object, key, this);
        this.lastAddedItem = this.lastAddedItem.next;
    } else {
        this.add(easeFunction, from, to, duration, object, key);
    }
}

EaseSystem.prototype.update = function(deltaTime) {
    for(var i = 0; i < this.items.length; ++i) {
        var item = this.items[i];
        item.update(deltaTime);
    }
}

EaseSystem.prototype.postUpdate = function() {
    for(var i = 0; i < this.items.length; ++i) {
        var item = this.items[i];
        if(item.done) {
            this.items.splice(i, 1);
            i--;
        }
    }
}

//-----------------------------------------------------------------------------

var TRANSITION_FADE = 0;
var TRANSITION_CIRCLE = 1;

function TransitionSystem() {
    this.timer = 0;
    this.playing = false;
    this.duration = 1;
    this.onChange = null;
    this.callbackExecuted = false;
    this.color = Color.Black;
    this.type = TRANSITION_FADE;
}

TransitionSystem.prototype.begin = function(onChange) {
    this.onChange = onChange;
    this.playing = true;
    this.timer = 0;
    this.callbackExecuted = false;
}

TransitionSystem.prototype.update = function(deltaTime) {
    if(this.playing) {
        var increment = deltaTime / this.duration;
        this.timer += increment;
        if(this.timer >= 0.5 && !this.callbackExecuted && this.onChange) {
            this.callbackExecuted = true;
            this.onChange();
        }
        if(this.timer > 1) {
            this.timer = 0;
            this.playing = false;
        }
    }
}

TransitionSystem.prototype.draw = function() {
    if(this.timer > 0) {
        var t = this.timer * 2;
        if(t > 1) {
            t = 2 - t;
            if(this.type == TRANSITION_CIRCLE) {
                var radius = t * renderer.size.x;
                renderer.drawCircle(renderer.size.x * 0.5, renderer.size.y * 0.5, radius, this.color, -100);
            } else if(this.type == TRANSITION_FADE) {
                var color = this.color.clone();
                color.a = t;
                renderer.drawRectangle(0, 0, renderer.size.x, renderer.size.y, color, -100);
            }
        } else {
            if(this.type == TRANSITION_CIRCLE) {
                var radius = t * renderer.size.x;
                renderer.drawCircle(renderer.size.x * 0.5, renderer.size.y * 0.5, radius, this.color, -100);
            } else if(this.type == TRANSITION_FADE) {
                var color = this.color.clone();
                color.a = t;
                renderer.drawRectangle(0, 0, renderer.size.x, renderer.size.y, color, -100);
            }
        }
    }
}

//-----------------------------------------------------------------------------

function Scene() {
    this.messages = new MessageSystem();

    this.entities = [];
    this.entitiesAdded = [];
    this.entitiesRemoved = [];
    this.entityTypeMap = {};
    this.entitiesCleared = false;
}

Scene.prototype.addEntityToTypeMap = function(entity) {
    for(var i = 0; i < entity.types.length; ++i) {
        var type = entity.types[i];
        if(!this.entityTypeMap[type]) {
            this.entityTypeMap[type] = [];
        }
        this.entityTypeMap[type].push(entity);
    }
}

Scene.prototype.buildTypeMap = function() {
    this.entityTypeMap = {};
    for(var i = 0; i < this.entities.length; ++i) {
        this.addEntityToTypeMap(this.entities[i]);
    }
}

Scene.prototype.update = function() {
    this.entitiesCleared = false;
    this.messages.update(this.deltaTime);
    
    if(!this.messages.isActive()) {
        for(var i = 0; i < this.entities.length; ++i) {
            var entity = this.entities[i];
            entity.update(game.deltaTime);
            if(this.entitiesCleared) {
                break;
            }
        }
    }
}

Scene.prototype.resolveEntityChanges = function() {
    for(var i = 0; i < this.entitiesAdded.length; ++i) {
        this.entitiesAdded[i].init();
        this.entities.push(this.entitiesAdded[i]);
    }
    for(var i = 0; i < this.entitiesRemoved.length; ++i) {
        this.entities.splice(this.entities.indexOf(this.entitiesRemoved[i]), 1);
    }
    this.entitiesAdded.length = 0;
    this.entitiesRemoved.length = 0;
}

Scene.prototype.checkCollision = function(entity, type, positionDelta, intersectionPoint) {
    var entities = this.entityTypeMap[type];
    if(entities) {
        for(var i = 0; i < entities.length; ++i) {
            var other = entities[i];
            if(entity != other) {
                if(entity.checkCollisionWith(other, positionDelta, intersectionPoint)) {
                    return other;
                }
            }
        }
    }
    return null;
}

Scene.prototype.checkOverlap = function(entity, type, offset) {
    var entities = this.entityTypeMap[type];
    if(entities) {
        for(var i = 0; i < entities.length; ++i) {
            var other = entities[i];
            if(entity != other) {
                if(entity.checkOverlapWith(other, offset)) {
                    return other;
                }
            }
        }
    }
    return null;
}

Scene.prototype.getFirstOfType = function(type) {
    if(this.entityTypeMap[type] && this.entityTypeMap[type].length > 0) {
        return this.entityTypeMap[type][0];
    }
    return null;
}

Scene.prototype.createEntity = function(entity) {
    this.entitiesAdded.push(entity);
    entity.scene = this;
    return entity;
}

Scene.prototype.destroyEntity = function(entity) {
    this.entitiesRemoved.push(entity);
}

Scene.prototype.clearEntities = function() {
    this.entities.length = 0;
    this.entitiesAdded.length = 0;
    this.entitiesRemoved.length = 0;
    this.entitiesCleared = true;
}

Scene.prototype.draw = function() {
    for(var i = 0; i < this.entities.length; ++i) {
        var entity = this.entities[i];
        entity.draw(this.deltaTime);
    }
    this.messages.draw();
}

//-----------------------------------------------------------------------------

function Game(width, height, actualWidth, actualHeight) {
    game = this;
    renderer = new Renderer(width, height, actualWidth, actualHeight);
    renderer.placeInElement(document.body);

    input = new Input(renderer);
    assets = new Assets();
    ease = new EaseSystem();

    this.transition = new TransitionSystem();

    this.hasFixedFrameRate = false;
    this.frameRateTarget = 60;
    this.frameCounter = 0;
    this.fps = this.frameRateTarget;
    this.frameTimer = 0;
    this.deltaTime = 0;
    this.maxDeltaTime = 1 / 10;
    this.lastTime = null;
    
    this.debugMode = false;
}

Game.prototype.start = function() {
    this.tick();
}

Game.prototype.tick = function() {
    requestAnimationFrame(this.tick.bind(this));

    var time = Date.now();
    var deltaTime;
    if(!this.lastTime) {
        deltaTime = 0;
    } else {
        deltaTime = (time - this.lastTime) / 1000.0;
    }
    this.lastTime = time;

    if(deltaTime > this.maxDeltaTime) {
        deltaTime = this.maxDeltaTime;
    }

    if(this.hasFixedFrameRate) {
        this.deltaTime = 1.0 / this.frameRateTarget;
    } else {
        this.deltaTime = deltaTime;
    }

    if(this.scene) {
        this.scene.buildTypeMap();
    }
    this.update();
    this.draw();
    if(this.scene) {
        this.scene.resolveEntityChanges();
    }
    input.endFrame();

    this.frameCounter++;
    this.frameTimer += deltaTime;
    if(this.frameTimer > 1) {
        this.frameTimer -= 1;
        this.fps = this.frameCounter;
        this.frameCounter = 0;
        if(this.frameTimer > 1) {
            this.frameTimer = 0;
        }
    }
}

Game.prototype.update = function() {
    this.transition.update(this.deltaTime);
    ease.update(this.deltaTime);
    if(this.scene) {
        this.scene.update(this.deltaTime);
    }
    ease.postUpdate();
}

Game.prototype.draw = function() {
    renderer.begin();

    if(this.scene) {
        this.scene.draw();
    }
    this.transition.draw();

    if(this.scene && this.debugMode) {
        renderer.drawText(16, 16, "Entity count: " + this.scene.entities.length + "   Ease count: " + ease.items.length + "   Fps: " + this.fps, Color.White, undefined, -10000);
    }

    renderer.end();
}

//-----------------------------------------------------------------------------

Collision = {
    lineVsCircle : function(lineFrom, lineTo, circlePosition, circleRadius, intersectionPoint) {
        var direction = lineTo.clone().subtract(lineFrom);
        var lineToCircle = lineFrom.clone().subtract(circlePosition);
        
        var a = direction.dot(direction);
        var b = 2 * lineToCircle.dot(direction);
        var c = lineToCircle.dot(lineToCircle) - circleRadius * circleRadius;

        var discriminant = b * b - 4 * a * c;

        if(discriminant > 0) {
            discriminant = Math.sqrt(discriminant);
            var t = (-b - discriminant) / (2 * a);
            if(t >= 0 && t <= 1) {
                var delta = direction.clone().scale(t);
                if(intersectionPoint) {
                    intersectionPoint.set(lineFrom.clone().add(delta));
                }
                return true;
            }
        }
        return false;
    }
}

//-----------------------------------------------------------------------------

function Rectangle(x, y, width, height) {
    this.set(x, y, width, height);
}

Rectangle.prototype.set = function(x, y, width, height) {
    this.x = x ? x : 0;
    this.y = y ? y : 0;
    this.width = width ? width : 0;
    this.height = height ? height : 0;
}

Rectangle.prototype.checkOverlap = function(other) {
    if(other instanceof Rectangle) {
        return !(this.x >= other.x + other.width || this.y >= other.y + other.height || this.x + this.width <= other.x || this.y + this.height <= other.y);
    } else {
        console.warn("Unsupported overlap check");
    }
    return false;
}

Rectangle.prototype.checkCollision = function(other, positionDelta, intersectionPoint) {
    console.warn("Unsupported collision check");
}

//-----------------------------------------------------------------------------

function Circle(x, y, radius) {
    this.set(x, y, radius);
}

Circle.prototype.set = function(x, y, radius) {
    this.x = x ? x : 0;
    this.y = y ? y : 0;
    this.radius = radius ? radius : 0;
}

Circle.prototype.checkOverlap = function(other) {
    if(other instanceof Circle) {
        var dx = this.x - other.x;
        var dy = this.y - other.y;
        var dr = other.radius + this.radius;
        return (dx * dx + dy * dy < dr * dr);
    } else {
        console.warn("Unsupported overlap check");
    }
}

Circle.prototype.checkCollision = function(other, positionDelta, intersectionPoint) {
    if(other instanceof Circle) {
        var radius = other.radius + this.radius;
        return Collision.lineVsCircle(this.position, positionDelta.clone().add(this.position), other.position, radius, intersectionPoint);
    } else {
        console.warn("Unsupported collision check");
    }
}

//-----------------------------------------------------------------------------

function Entity(x, y, radius, color) {
    this.position = new Vector2(x, y);
    this.velocity = new Vector2(0, 0);
    this.collisionVolume = null;
    this.color = color;
    this.types = [];
    this.scene = null;
}

Entity.prototype.checkOverlapWith = function(other, offset) {
    if(this.collisionVolume && other.collisionVolume) {
        var dx = this.position.x;
        var dy = this.position.y;
        if(offset) {
            dx += offset.x;
            dy += offset.y;
        }

        this.collisionVolume.x += dx;
        this.collisionVolume.y += dy;
        other.collisionVolume.x += other.position.x;
        other.collisionVolume.y += other.position.y;

        var result = this.collisionVolume.checkOverlap(other.collisionVolume);

        this.collisionVolume.x -= dx;
        this.collisionVolume.y -= dy;
        other.collisionVolume.x -= other.position.x;
        other.collisionVolume.y -= other.position.y;

        return result;
    }
    return false;
}

Entity.prototype.checkCollisionWith = function(other, positionDelta, intersectionPoint) {
    if(this.collisionVolume && other.collisionVolume) {
        return this.collisionVolume.checkCollision(other.collisionVolume, positionDelta, intersectionPoint);
    }
    return false;
}

Entity.prototype.checkCollision = function(type, positionDelta, intersectionPoint) {
    return this.scene.checkCollision(this, type, positionDelta, intersectionPoint);
}

Entity.prototype.checkOverlap = function(type, offset) {
    return this.scene.checkOverlap(this, type, offset);
}

Entity.prototype.moveToContact = function(other, direction) {
    if(this.collisionVolume instanceof Rectangle && other.collisionVolume instanceof Rectangle) {
        switch(direction) {
            case Direction.RIGHT:
                this.position.x = other.position.x + other.collisionVolume.x - this.collisionVolume.width - this.collisionVolume.x;
                break;
            case Direction.LEFT:
                this.position.x = other.position.x + other.collisionVolume.x + other.collisionVolume.width - this.collisionVolume.x;
                break;
            case Direction.DOWN:
                this.position.y = other.position.y + other.collisionVolume.y - this.collisionVolume.height - this.collisionVolume.y;
                break;
            case Direction.UP:
                this.position.y = other.position.y + other.collisionVolume.y + other.collisionVolume.height - this.collisionVolume.y;
                break;
        }
    } else {
        console.warn("moveToContact not implemented for this collision volume combination");
    }
}

Entity.prototype.init = function() {

}

Entity.prototype.update = function(deltaTime) {
    var delta = this.velocity.clone().scale(deltaTime);
    this.position.add(delta);
}

Entity.prototype.draw = function() {
    if(this.radius) {
        renderer.drawCircle(this.position.x, this.position.y, this.radius, this.color);
    }
}

Entity.prototype.destroy = function() {
    this.scene.destroyEntity(this);
}

//-----------------------------------------------------------------------------

function ParticleAttribute(min, max) {
    this.set(min, max);
}

ParticleAttribute.prototype.set = function(min, max) {
    this.min = min;
    this.max = max ? max : min;
}

ParticleAttribute.prototype.getValue = function() {
    return Math.random() * (this.max - this.min) + this.min;
}

//-----------------------------------------------------------------------------

function ParticleSystem() {
    Entity.call(this);
    this.particles = [];
    this.destroyWhenEmpty = true;

    this.streamRate = 0;
    this.streamTime = 0;
    this.streamRateTimer = 0;
    this.streamPosition = new Vector2();
    this.depth = 10;

    this.color = new Color(1, 1, 1);
    this.radius = new ParticleAttribute(2, 8);
    this.speed = new ParticleAttribute(60, 600);
    this.direction = new ParticleAttribute(0, Math.PI * 2);
    this.life = new ParticleAttribute(0.1, 2);
    this.deceleration = new ParticleAttribute(120);
    this.acceleration = new ParticleAttribute(0);
    this.flickerIntensity = new ParticleAttribute(0);
}

ParticleSystem.prototype = new Entity();

ParticleSystem.prototype.update = function(deltaTime) {
    if(this.streamTime > 0) {
        this.streamTime -= deltaTime;
        this.streamRateTimer += deltaTime;
        var rate = 1 / this.streamRate;
        while(this.streamRateTimer > 0) {
            this.streamRateTimer -= rate;
            this.spawn(this.streamPosition.x, this.streamPosition.y);
        }
    }

    for(var i = 0; i < this.particles.length; ++i) {
        var particle = this.particles[i];
        particle.speed -= particle.deceleration * deltaTime;
        if(particle.speed < 0) {
            particle.speed = 0;
        }
        particle.speed += particle.acceleration * deltaTime;
        particle.position.x += Math.cos(particle.direction) * particle.speed * deltaTime;
        particle.position.y -= Math.sin(particle.direction) * particle.speed * deltaTime;
        particle.life -= deltaTime;
        particle.color.a = particle.life / particle.lifeTime;
        
        particle.flickerTimer += deltaTime;
        if(particle.flickerTimer > particle.flickerInterval) {
            var t = particle.flickerTimer - particle.flickerInterval;
            if(t > particle.flickerLength) {
                particle.flickerTimer -= particle.flickerInterval + particle.flickerLength;
            } else {
                t /= particle.flickerLength;
                particle.color.a += Math.sin(t * Math.PI) * particle.flickerIntensity;
            }
        }
    }

    for(var i = 0; i < this.particles.length; ++i) {
        var particle = this.particles[i];
        if(particle.life <= 0) {
            this.particles.splice(i, 1);
        }
    }

    if(this.destroyWhenEmpty && this.particles.length == 0) {
        this.destroy();
    }
}

ParticleSystem.prototype.draw = function() {
    renderer.drawParticleSystem(this, this.depth);
}

ParticleSystem.prototype._draw = function() {
    for(var i = 0; i < this.particles.length; ++i) {
        var particle = this.particles[i];
        renderer._drawCircle(particle.position.x, particle.position.y, particle.radius, particle.color);
    }
}

ParticleSystem.prototype.spawn = function(x, y) {
    var life = this.life.getValue();
    var flickerInterval = 0.4;
    var particle = {
        position : new Vector2(x, y),
        speed : this.speed.getValue(),
        acceleration : this.acceleration.getValue(),
        deceleration : this.deceleration.getValue(),
        direction : this.direction.getValue(),
        radius : this.radius.getValue(),
        color : this.color.clone(),
        life : life,
        lifeTime : life,
        destroy : false,
        flickerInterval : flickerInterval,
        flickerLength : 0.05,
        flickerTimer : Math.random() * flickerInterval,
        flickerIntensity : this.flickerIntensity.getValue()
    };
    this.particles.push(particle);
}

ParticleSystem.prototype.burst = function(x, y, count) {
    for(var i = 0; i < count; ++i) {
        this.spawn(x, y);
    }
}

ParticleSystem.prototype.stream = function(x, y, rate, time) {
    this.streamRate = rate;
    this.streamTime = time;
    this.streamPosition = new Vector2(x, y);
}