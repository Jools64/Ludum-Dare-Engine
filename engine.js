var KEY_COUNT = 255;

var KEY_UP = "ArrowUp";
var KEY_DOWN = "ArrowDown";
var KEY_LEFT = "ArrowLeft";
var KEY_RIGHT = "ArrowRight";
var KEY_Z = "KeyZ";
var KEY_X = "KeyX";
var KEY_W = "KeyW";
var KEY_A = "KeyA";
var KEY_S = "KeyS";
var KEY_D = "KeyD";
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

var game, renderer, input, assets, ease;

//-----------------------------------------------------------------------------

// https://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect

function intersectLineVsLine(af, at, bf, bt, intersectionPoint) {
    var s1x, s1y, s2x, s2y;
    s1x = at.x - af.x;
    s1y = at.y - af.y;
    s2x = bt.x - bf.x;
    s2y = bt.y - bf.y;

    var s, t;
    s = (-s1y * (af.x - bf.x) + s1x * (af.y - bf.y)) / (-s2x * s1y + s1x * s2y);
    t = ( s2x * (af.y - bf.y) - s2y * (af.x - bf.x)) / (-s2x * s1y + s1x * s2y);

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
        // Collision detected
        if (intersectionPoint) {
            intersectionPoint.x = af.x + (t * s1x);
            intersectionPoint.y = af.y + (t * s1y);
        }
        return 1;
    }

    return false;
}

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

Utils = {
    sign : function(value) {
        return value > 0 ? 1 : value < 0 ? -1 : 0;
    },

    clamp : function(value, min, max) {
        return value < min ? min : (value > max ? max : value);
    },

    distance : function(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt((dx * dx) + (dy * dy));
    },

    randomBetween : function(from, to) {
        var delta = to - from;
        return Math.random() * delta + from;
    },

    angleBetween : function(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.atan2(-dy, dx);
    },

    mixin : function(base, mixer) {
        if(mixer !== undefined) {
            for(key in mixer) {
                base[key] = mixer[key];
            }
        }
        return base;
    }
};

//-----------------------------------------------------------------------------

function Texture(url, onLoad, size) {
    this.loaded = false;
    this.size = new Vector2();
    this.renderScale = new Vector2();
    this.image = new Image();
    this.onLoad = onLoad;
    this.image.addEventListener('load', function(size) {
        this.size.set(this.image.width, this.image.height);
        if(size) {
            this.renderScale.set(size.x / this.image.width, size.y / this.image.height);
        } else {
            this.renderScale.set(1, 1);
        }
        this.loaded = true;
        if(this.onLoad) {
            this.onLoad();
        }
    }.bind(this, size), false);
    this.image.src = url;
}

//-----------------------------------------------------------------------------

function Bounds(left, top, right, bottom) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
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

function Grid(width, height, cellWidth, cellHeight) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.rectangle = new Rectangle(0, 0, cellWidth, cellHeight);
    this.data = [];
    this.fill(0);
}

Grid.prototype.setCellSize = function(width, height) {
    this.rectangle.width = width;
    this.rectangle.height = height;
}

Grid.prototype.fill = function(value) {
    for(var y = 0; y < this.height; ++y) {
        for(var x = 0; x < this.width; ++x) {
            this.data[x + y * this.width] = value;
        }
    }
}

Grid.prototype.set = function(x, y, value) {
    if(x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.data[x + y * this.width] = value;
    }
}

Grid.prototype.get = function(x, y) {
    if(x >= 0 && x < this.width && y >= 0 && y < this.height) {
        return this.data[x + y * this.width];
    }
    return 0;
}

//-----------------------------------------------------------------------------

function TileMap(texture, width, height, tileWidth, tileHeight) {
    this.texture = texture;
    this.grid = new Grid(width, height);
    this.tileSize = new Vector2(tileWidth, tileHeight);
}

TileMap.prototype.fill = function(value) {
    this.grid.fill(value);
}

TileMap.prototype.set = function(x, y, value) {
    this.grid.set(x, y, value);
}

TileMap.prototype.get = function(x, y) {
    return this.grid.get(x, y);
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
                this.onLoad(this.data);
            }
        }
    }.bind(this);
 
    this.request.open("GET", url, true);
    this.request.send();
}

//-----------------------------------------------------------------------------

function TextFile(url, onLoad) {
    this.loaded = false;
    this.data = null;
    this.request = new XMLHttpRequest();
    this.onLoad = onLoad;
    this.request.onreadystatechange = function() {
        if(this.request.readyState == 4 && this.request.status == 200) {
            var data = this.request.responseText;
            this.loaded = true;
            this.data = data;
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
    this.text = {};
    this.onLoad = null;

    this.loadTexture("phoneControllerOverlay", "../engine/assets/textures/phoneControllerOverlay.png");
    this.loadTexture("regularFont", "../engine/assets/textures/regularFont.png");
    this.loadJson("regularFontData", "../engine/assets/data/regularFont.json");
}

Assets.prototype.checkLoaded = function() {
    var loaded = true;
    for(var key in this.textures) {
        if(!this.textures[key].loaded) {
            loaded = false;
        }
    }
    for(var key in this.json) {
        if(!this.json[key].loaded) {
            loaded = false;
        }
    }
    for(var key in this.text) {
        if(!this.text[key].loaded) {
            loaded = false;
        }
    }
    if(loaded && this.onLoad) {
        var callback = this.onLoad;
        this.onLoad = null;
        callback();
    }
}

Assets.prototype.load = function(url, onDone) {
    new Json(url, function(assetList) {
        var relativePath = "";
        var lastSlashIndex = url.lastIndexOf("/");
        if(lastSlashIndex != -1) {
            relativePath = url.substr(0, lastSlashIndex) + "/";
        }
        if(assetList) {
            if(assetList.textures) {
                var texturePath = assetList.texturePath === undefined ? "" : assetList.texturePath;
                texturePath = relativePath + texturePath;
                for(var i = 0; i < assetList.textures.length; ++i) {
                    var textureItem = assetList.textures[i];
                    assets.loadTexture(textureItem.name, texturePath + textureItem.file, textureItem.size);
                }
            }
            if(assetList.json) {
                var jsonPath = assetList.jsonPath === undefined ? "" : assetList.jsonPath;
                jsonPath = relativePath + jsonPath;
                for(var i = 0; i < assetList.json.length; ++i) {
                    assets.loadJson(assetList.json[i].name, jsonPath + assetList.json[i].file);
                }
            }
            if(assetList.text) {
                var textPath = assetList.textPath === undefined ? "" : assetList.textPath;
                textPath = relativePath + textPath;
                for(var i = 0; i < assetList.text.length; ++i) {
                    assets.loadText(assetList.text[i].name, textPath + assetList.text[i].file);
                }
            }
            assets.onLoad = onDone;
        }
        this.checkLoaded();
    }.bind(this));
}

Assets.prototype.loadTexture = function(name, url, size) {
    this.textures[name] = new Texture(url, this.checkLoaded.bind(this), size);
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

Assets.prototype.loadText = function(name, url) {
    this.text[name] = new TextFile(url, this.checkLoaded.bind(this));
}

Assets.prototype.getText = function(name) {
    if(this.text[name]) {
        return this.text[name].data;
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
Color.TransparentBlue = new Color(0.2, 0.4, 1.0, 0.5);
Color.TransparentPurple = new Color(0.6, 0.2, 1.0, 0.5);

//-----------------------------------------------------------------------------

function Font(properties) {
    this.size = 12;
    this.lineHeight = this.size;
    this.weight = FONT_WEIGHT_NORMAL;
    this.style = FONT_STYLE_NONE;
    this.family = "arial";
    this.horizontalAlign = ALIGN_LEFT;
    this.verticalAlign = ALIGN_TOP;
    this.outlineSize = 0;
    this.outlineColor = 0;
    Utils.mixin(this, properties);
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

function BitmapFont(data) {
    this.texture = assets.getTexture(data.texture);
    this.characterSize = new Vector2(
        data.characterSize.width, 
        data.characterSize.height
    );
    this.singleCase = data.singleCase;
    this.characterMap = [];
    for(var i = 0; i < 255; ++i) {
        this.characterMap[i] = -1;
    }
    for(var i = 0; i < data.layout.length; ++i) {
        var c = data.layout.charCodeAt(i);
        this.characterMap[c] = i;
    }
}

//-----------------------------------------------------------------------------

function Vector2(x, y) {
    this.set(x, y);
}

Vector2.prototype.set = function(x, y) {
    if(x instanceof Vector2) {
        this.x = x.x;
        this.y = x.y;
    } else {
        this.x = x === undefined ? 0 : x;
        this.y = y === undefined ? 0 : y;
    }
    return this;
}

Vector2.prototype.add = function(x, y) {
    if(x instanceof Vector2) {
        this.x += x.x;
        this.y += x.y;
    } else {
        this.x += x;
        this.y += y;
    }
    return this;
}

Vector2.prototype.subtract = function(x, y) {
    if(x instanceof Vector2) {
        this.x -= x.x;
        this.y -= x.y;
    } else {
        this.x -= x;
        this.y -= y;
    }
    return this;
}

Vector2.prototype.multiply = function(x, y) {
    if(x instanceof Vector2) {
        this.x *= x.x;
        this.y *= x.y;
    } else {
        this.x *= x;
        this.y *= y;
    }
    return this;
}

Vector2.prototype.divide = function(x, y) {
    if(x instanceof Vector2) {
        this.x /= x.x;
        this.y /= x.y;
    } else {
        this.x /= x;
        this.y /= y;
    }
    return this;
}

Vector2.prototype.scale = function(value) {
    this.x *= value;
    this.y *= value;
    return this;
}

Vector2.prototype.normalize = function() {
    var length = this.length();
    if(length > 0) {
        this.scale(1 / length);
    }
    return this;
}

Vector2.prototype.clone = function() {
    return new Vector2(this.x, this.y);
}

Vector2.prototype.dot = function(other) {
    return this.x * other.x + this.y * other.y;
}

Vector2.prototype.length = function(other) {
    return Math.sqrt((this.x * this.x) + (this.y * this.y));
}

Vector2.prototype.lengthSquared = function(other) {
    return (this.x * this.x) + (this.y * this.y);
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

function Camera() {
    this.x = 0;
    this.y = 0;
    this.targetX = this.x;
    this.targetY = this.y;
    this.bounds = null;
    this.zoom = 1;
    this.angle = 0;
    this.easeSpeed = 16;
}

Camera.prototype.setPosition = function(x, y, skipEase) {
    if(x instanceof Vector2) {
        this.targetX = x.x;
        this.targetY = x.y;
    } else {
        this.targetX = x;
        this.targetY = y;
    }              
    if(this.bounds) {
        this.targetX = Utils.clamp(this.targetX, this.bounds.left + renderer.size.x * 0.5, this.bounds.right - renderer.size.x * 0.5);
        this.targetY = Utils.clamp(this.targetY, this.bounds.top  + renderer.size.y * 0.5, this.bounds.bottom - renderer.size.y * 0.5);
    }
    if(skipEase) {
        this.x = this.targetX;
        this.y = this.targetY;
    }
}

Camera.prototype.update = function(deltaTime) {
    if(this.easeSpeed) {
        this.x += (this.targetX - this.x) * Math.min(deltaTime * this.easeSpeed, 1);
        this.y += (this.targetY - this.y) * Math.min(deltaTime * this.easeSpeed, 1);
    } else {
        this.x = this.targetX;
        this.y = this.targetY;
    }
}

Camera.prototype.setBounds = function(left, top, right, bottom) {
    this.bounds = new Bounds(left, top, right, bottom);
}

Camera.prototype.clearBounds = function() {
    this.bounds = null;
}

//-----------------------------------------------------------------------------

function Renderer(width, height, actualWidth, actualHeight) {
    this.size = new Vector2(width, height);
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.autoSize = false;
    this.linearFiltering = true;
    this.divisibleAutoSize = false;
    this.camera = new Camera();
    this.camera.setPosition(width * 0.5, height * 0.5, true);
    this.depthSorting = true;

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

Renderer.prototype.update = function(deltaTime) {
    this.camera.update(deltaTime);
}

Renderer.prototype.placeInElement = function(element) {
    element.appendChild(this.canvas);
}

Renderer.prototype.begin = function() {
    this.clear();
    this.renderTree.clear();
}

Renderer.prototype.applyCameraTranformation = function() {
    if(this.camera) {
        // Attempt to prevent glitches caused by subpixel camera positions
        var zoom = this.canvas.width / this.size.x;
        this.translate(-this.size.x, -this.size.y);
        this.scale(this.camera.zoom, this.camera.zoom);
        this.rotate(this.camera.angle, this.camera.angle);
        this.translate(this.size.x, this.size.y);
        this.translate(-this.camera.x + this.size.x * 0.5, -this.camera.y + this.size.y * 0.5);
    }
}

Renderer.prototype.flush = function() {
    if(this.depthSorting) {
        this.renderTree.forEach(function(item) {
            item.function.apply(this, item.arguments);
        }.bind(this));
        this.renderTree.clear();
    }
}

Renderer.prototype.end = function() {
    this.flush();
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

Renderer.prototype.rotate = function(angle) {
    this.ctx.rotate(angle);
}

Renderer.prototype.translate = function(x, y) {
    this.ctx.translate(x, y);
}

Renderer.prototype.drawTile = function(x, y, texture, tileWidth, tileHeight, tileIndex, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawTile, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawTile(x, y, texture, tileWidth, tileHeight, tileIndex);
    }
}

Renderer.prototype._drawTile = function(x, y, texture, tileWidth, tileHeight, tileIndex) {
    var frameX = (tileIndex * tileWidth) % texture.size.x;
    var frameY = (~~((tileIndex * tileWidth) / texture.size.x)) * tileHeight;
    this.ctx.drawImage(
        texture.image, frameX, frameY, 
        tileWidth, tileHeight, 
        x, y,
        tileWidth, tileHeight
    );
}

Renderer.prototype.drawRectangle = function(x, y, width, height, color, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawRectangle, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawRectangle(x, y, width, height, color);
    }
}

Renderer.prototype._drawRectangle = function(x, y, width, height, color) {
    this.ctx.fillStyle = color.toStyle();
    this.ctx.fillRect(x, y, width, height);
}

Renderer.prototype.drawCircle = function(x, y, radius, color, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawCircle, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawCircle(x, y, radius, color);
    }
}

Renderer.prototype._drawCircle = function(x, y, radius, color) {
    this.ctx.fillStyle = color.toStyle();
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
}

Renderer.prototype.drawTexture = function(x, y, texture, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawTexture, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawTexture(x, y, texture);
    }
}

Renderer.prototype._drawTexture = function(x, y, texture) {
    if(texture.loaded) {
        this.ctx.drawImage(
            texture.image, x, y, 
            texture.size.x * texture.renderScale.x, 
            texture.size.y * texture.renderScale.y
        );
    }
}

Renderer.prototype.drawTextureScaled = function(x, y, texture, scaleX, scaleY, originX, originY, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawTextureScaled, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawTextureScaled(x, y, texture, scaleX, scaleY, originX, originY);
    }
}

Renderer.prototype._drawTextureScaled = function(x, y, texture, scaleX, scaleY, originX, originY) {
    if(texture.loaded) {
        this.ctx.save();
        this.ctx.translate(x + originX, y + originY);
        this.ctx.scale(scaleX, scaleY);
        this.ctx.translate(-(x + originX), -(y + originY));
        this.ctx.drawImage(
            texture.image, x, y, 
            texture.size.x * texture.renderScale.x, 
            texture.size.y * texture.renderScale.y
        );
        this.ctx.restore();
    }
}

Renderer.prototype.drawTextureRotated = function(x, y, texture, angle, originX, originY, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawTextureRotated, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawTextureRotated(x, y, texture, angle, originX, originY);
    }
}

Renderer.prototype._drawTextureRotated = function(x, y, texture, angle, originX, originY) {
    if(texture.loaded) {
        this.ctx.save();
        this.ctx.translate(x + originX, y + originY);
        this.ctx.rotate(angle);
        this.ctx.translate(-(x + originX), -(y + originY));
        this.ctx.drawImage(
            texture.image, x, y, 
            texture.size.x * texture.renderScale.x, 
            texture.size.y * texture.renderScale.y
        );
        this.ctx.restore();
    }
}

Renderer.prototype.drawSprite = function(x, y, sprite, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawSprite, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawSprite(x, y, sprite);
    }
}

Renderer.prototype._drawSprite = function(x, y, sprite) {
    if(sprite.visible && sprite.definition.texture && sprite.definition.texture.loaded) {
        var texture = sprite.definition.texture;
        var width = sprite.definition.size.x / texture.renderScale.x;
        var height = sprite.definition.size.y / texture.renderScale.y;
        var frameX = (sprite.frame * width) % texture.size.x;
        var frameY = (~~((sprite.frame * width) / texture.size.x)) * height;
        var scaleX = sprite.scale.x * (sprite.flip.x ? -1 : 1);
        var scaleY = sprite.scale.y * (sprite.flip.y ? -1 : 1);

        this.ctx.save();
        this.ctx.translate((x + sprite.origin.x + sprite.offset.x), (y + sprite.origin.y + sprite.offset.y));
        this.ctx.scale(scaleX, scaleY);
        this.ctx.rotate(-sprite.angle);
        this.ctx.translate(-sprite.origin.x, -sprite.origin.y);
        this.ctx.drawImage(texture.image, frameX, frameY, width, height, 0, 0, width * texture.renderScale.x, height * texture.renderScale.y);
        this.ctx.restore();
    }
}

Renderer.prototype.drawTileMap = function(x, y, tileMap, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawTileMap, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawTileMap(x, y, tileMap);
    }
}

Renderer.prototype._drawTileMap = function(x, y, tileMap) {
    this.ctx.save();
    this.ctx.translate(x, y);
    var uvEpsilon = 0.001; // Prevent flickering between tiles with an epsilon
    var sizeEpsilon = 0.001;
    var texture = tileMap.texture;
    var tileWidth = tileMap.tileSize.x;
    var tileHeight = tileMap.tileSize.y;
    var fx = Utils.clamp(Math.floor((this.camera.x - this.size.x * 0.5 - x) / tileWidth), 0, tileMap.grid.width),
        fy = Utils.clamp(Math.floor((this.camera.y - this.size.y * 0.5 - y) / tileHeight), 0, tileMap.grid.height),
        tx = Utils.clamp(Math.ceil((this.camera.x + this.size.x * 0.5 - x) / tileWidth), 0, tileMap.grid.width),
        ty = Utils.clamp(Math.ceil((this.camera.y + this.size.y * 0.5 - y) / tileHeight), 0, tileMap.grid.height);
    for(var t = fy; t < ty; ++t) {
        for(var i = fx; i < tx; ++i) {
            var tileIndex = tileMap.grid.get(i, t);
            var frameX = (tileIndex * tileWidth) % texture.size.x;
            var frameY = (~~((tileIndex * tileWidth) / texture.size.x)) * tileHeight;
            this.ctx.drawImage(
                texture.image, frameX + uvEpsilon, frameY + uvEpsilon, 
                tileWidth - uvEpsilon * 2, tileHeight - uvEpsilon * 2, 
                (i * tileWidth) - sizeEpsilon, (t * tileHeight) - sizeEpsilon, 
                tileWidth + sizeEpsilon * 2, tileHeight + sizeEpsilon * 2
            );
        }
    }
    this.ctx.restore();
}

Renderer.prototype.drawTileBox = function(texture, x, y, width, height, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawTileBox, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawTileMap(texture, x, y, width, height);
    }
}

Renderer.prototype._drawTileBox = function(texture, x, y, width, height) {
    this.ctx.save();
    this.ctx.translate(x, y);
    var tileSize = texture.size.x / 3;
    width = Math.ceil(width / tileSize);
    height = Math.ceil(height / tileSize);
    for(var t = 0; t < height; ++t) {
        for(var i = 0; i < width; ++i) {
            var index = 4;
            if(i == 0) {
                index = 3;
            } else if(i == width - 1) {
                index = 5;
            } else if(t == 0) {
                index = 1;
            } else if(t == height - 1) {
                index = 7;
            }
            if(i == 0 && t == 0) {
                index = 0;
            } else if(i ==  width - 1 && t == 0) { 
                index = 2;
            } else if(i == 0 && t == height - 1) { 
                index = 6;
            } else if(i == width - 1 && t == height - 1) { 
                index = 8;
            }
            this._drawTile(i * tileSize, t * tileSize, texture, tileSize, tileSize, index);
        }
    }
    this.ctx.restore();
}

Renderer.prototype.drawGrid = function(grid, color, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawGrid, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawGrid(grid, color);
    }
}

Renderer.prototype._drawGrid = function(grid, color) {
    for(var y = 0; y < grid.height; ++y) {
        for(var x = 0; x < grid.width; ++x) {
            if(grid.get(x, y)) {
                renderer.drawRectangle(x * grid.rectangle.width, y * grid.rectangle.height, grid.rectangle.width, grid.rectangle.height, color);
            }
        }
    }
}

Renderer.prototype.drawParticleSystem = function(particleSystem, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawParticleSystem, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawParticleSystem(particleSystem);
    }
}

Renderer.prototype._drawParticleSystem = function(particleSystem) {
    particleSystem._draw();
}

Renderer.prototype.drawText = function(x, y, text, color, font, depth) {
    if(this.depthSorting) {
        this.renderTree.add({ function : this._drawText, arguments : arguments}, depth ? -depth : 0);
    } else {
        this._drawText(x, y, text, color, font);
    }
}

Renderer.prototype._drawText = function(x, y, text, color, font) {
    var font = font ? font : Font.Default;
    if(font instanceof BitmapFont) {
        var offsetX = 0;
        var offsetY = 0;
        if(font.singleCase) {
            text = text.toLowerCase();
        }
        for(var i = 0; i < text.length; ++i) {
            var c = text.charCodeAt(i);
            var index = font.characterMap[c];
            if(c == 10) {
                offsetY += font.characterSize.y;
                offsetX = 0;
            } else {
                if(index >= 0) {
                    this._drawTile(
                        x + offsetX, y + offsetY, font.texture, 
                        font.characterSize.x, font.characterSize.y, index
                    );
                }
                offsetX += font.characterSize.x;
            }
        }
    } else {
        font.applyStyles();
        var lines = text.split("\n");
        for(var i = 0; i < lines.length; ++i) {
            var text = lines[i];
            var offsetY = i * font.lineHeight;
            switch(font.verticalAlign) {
                case ALIGN_CENTRE: offsetY -= 0.5 * lines.length * font.lineHeight; break;
                case ALIGN_BOTTOM: offsetY -= lines.length * font.lineHeight; break;
                default: break;
            }
            if(font.outlineColor && font.outlineSize) {
                this.ctx.lineJoin = 'round';
                this.ctx.miterLimit = 2;
                this.ctx.strokeStyle = font.outlineColor.toStyle();
                this.ctx.lineWidth = font.outlineSize;
                this.ctx.strokeText(text, x, y + offsetY);
            }
            this.ctx.fillStyle = color.toStyle();
            this.ctx.fillText(text, x, y + offsetY);
        }
    }
}

//-----------------------------------------------------------------------------

function ControllerAxis() {
    this.value = 0;
    this.lastValue = 0;

    this.negativeKeys = [];
    this.positiveKeys = [];
    this.padAxes = [];
    this.positiveTouchRegion = null;
    this.negativeTouchRegion = null;
}

ControllerAxis.prototype.addKeys = function(negativeKey, positiveKey) {
    this.negativeKeys.push(negativeKey);
    this.positiveKeys.push(positiveKey);
}

ControllerAxis.prototype.setTouchRegions = function(negativeBounds, positiveBounds) {
    this.negativeTouchRegion = negativeBounds
    this.positiveTouchRegion = positiveBounds;
}

ControllerAxis.prototype.update = function(input) {
    this.lastValue = this.value;
    var negativeValue = 0;
    var positiveValue = 0;
    for(var i = 0; i < this.negativeKeys.length; ++i) {
        if(input.checkKey(this.negativeKeys[i])) {
            negativeValue += 1;
        }
    }
    for(var i = 0; i < this.positiveKeys.length; ++i) {
        if(input.checkKey(this.positiveKeys[i])) {
            positiveValue += 1;
        }
    }

    if(this.positiveTouchRegion) {
        if(input.checkTouchRegion(
            this.positiveTouchRegion.left, 
            this.positiveTouchRegion.top, 
            this.positiveTouchRegion.right, 
            this.positiveTouchRegion.bottom
        )) {
            positiveValue += 1;
        }
    }

    if(this.negativeTouchRegion) {
        if(input.checkTouchRegion(
            this.negativeTouchRegion.left, 
            this.negativeTouchRegion.top, 
            this.negativeTouchRegion.right, 
            this.negativeTouchRegion.bottom
        )) {
            negativeValue += 1;
        }
    }

    negativeValue = Math.min(1, negativeValue);
    positiveValue = Math.min(1, positiveValue);
    this.value = positiveValue - negativeValue;
}

//-----------------------------------------------------------------------------

function ControllerButton() {
    this.value = false;
    this.pressed = false;
    this.released = false;

    this.keys = [];
    this.padButtons = [];
    this.touchRegion = null;
}

ControllerButton.prototype.setTouchRegion = function(bounds) {
    this.touchRegion = bounds;
}

ControllerButton.prototype.addKey = function(key) {
    this.keys.push(key);
}

ControllerButton.prototype.update = function(input) {
    this.value = false;
    this.pressed = false;
    this.released = false;
    for(var i = 0; i < this.keys.length; ++i) {
        var key = this.keys[i];
        if(input.checkKey(key)) {
            this.value = true;
        }
        if(input.checkKeyPressed(key)) {
            this.pressed = true;
        }
        if(input.checkKeyReleased(key)) {
            this.released = true;
        }
    }
    if(this.touchRegion) {
        if(input.checkTouchRegion(
            this.touchRegion.left, 
            this.touchRegion.top, 
            this.touchRegion.right, 
            this.touchRegion.bottom
        )) {
            this.value = true;
        }
        if(input.checkTouchRegionPressed(
            this.touchRegion.left, 
            this.touchRegion.top, 
            this.touchRegion.right, 
            this.touchRegion.bottom
        )) {
            this.pressed = true;
        }
        if(input.checkTouchRegionReleased(
            this.touchRegion.left, 
            this.touchRegion.top, 
            this.touchRegion.right, 
            this.touchRegion.bottom
        )) {
            this.released = true;
        }
    }
}

//-----------------------------------------------------------------------------

function Controller() {
    this.padIndex = 0;
    this.axisX = new ControllerAxis();
    this.axisY = new ControllerAxis();
    this.action = new ControllerButton();
    this.cancel = new ControllerButton();
    this.start = new ControllerButton();
};

Controller.prototype.applyDefaultBindings = function() {
    this.axisX.addKeys("ArrowLeft", "ArrowRight");
    this.axisY.addKeys("ArrowUp", "ArrowDown");
    this.axisX.addKeys("KeyA", "KeyD");
    this.axisY.addKeys("KeyW", "KeyS");
    this.axisX.setTouchRegions(new Bounds(8, 88, 8 + 16, 88 + 48), new Bounds(40, 88, 40 + 16, 88 + 48));
    this.axisY.setTouchRegions(new Bounds(8, 88, 8 + 48, 88 + 16), new Bounds(8, 120, 48 + 8, 120 + 16));
    this.action.addKey("KeyZ");
    this.action.setTouchRegion(new Bounds(216, 105, 216 + 32, 105 + 32));
    this.cancel.addKey("KeyX");
    this.cancel.setTouchRegion(new Bounds(176, 105, 176 + 32, 105 + 32));
    this.start.addKey("Enter");
    this.start.setTouchRegion(new Bounds(112, 120, 112 + 32, 120 + 20));
}

Controller.prototype.update = function(input) {
    for(var key in this) {
        var binding = this[key];
        if(binding instanceof ControllerAxis || binding instanceof ControllerButton) {
            binding.update(input);
        }
    }
}

//-----------------------------------------------------------------------------

function TouchPoint(index) {
    this.index = index;
    this.position = new Vector2();
    this.value = false;
    this.pressed = false;
    this.released = false;
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
    this.mouseLastPosition = new Vector2();
    this.mouseDeltaPosition = new Vector2();
    this.mouseDragging = false;
    this.mouseDragOrigin = new Vector2();
    this.mouseDragDistance = new Vector2();
    this.padButtons = [];
    this.padButtonsPressed = [];
    this.padButtonsReleased = [];
    this.padAxes = [];
    this.controllers = [];
    this.touchPoints = [];

    for(var i = 0; i < 8; ++i) {
        this.touchPoints[i] = new TouchPoint(i);
    }

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

    window.addEventListener("touchstart", function(event) {
        event.preventDefault();
        // TODO: Only fetch bounds once per frame
        var canvasBounds = this.renderer.canvas.getBoundingClientRect();
        var touches = event.changedTouches;
        for(var i = 0; i < touches.length; ++i) {
            var touch = touches[i];
            if(this.touchPoints[touch.identifier]) {
                this.setTouchPositionFromTouch(this.touchPoints[touch.identifier], touch, canvasBounds);
                this.touchPoints[touch.identifier].value = true;
                this.touchPoints[touch.identifier].pressed = true;
            }
        }
    }.bind(this), { passive: false });

    window.addEventListener("touchmove", function(event) {
        event.preventDefault();
        // TODO: Only fetch bounds once per frame
        var canvasBounds = this.renderer.canvas.getBoundingClientRect();
        var touches = event.changedTouches;
        for(var i = 0; i < touches.length; ++i) {
            var touch = touches[i];
            if(this.touchPoints[touch.identifier]) {
                this.setTouchPositionFromTouch(this.touchPoints[touch.identifier], touch, canvasBounds);
            }
        }
    }.bind(this), { passive: false });

    window.addEventListener("touchend", function(event) {
        event.preventDefault();
        // TODO: Only fetch bounds once per frame
        var canvasBounds = this.renderer.canvas.getBoundingClientRect();
        var touches = event.changedTouches;
        for(var i = 0; i < touches.length; ++i) {
            var touch = touches[i];
            if(this.touchPoints[touch.identifier]) {
                this.setTouchPositionFromTouch(this.touchPoints[touch.identifier], touch, canvasBounds);
                this.touchPoints[touch.identifier].value = false;
                this.touchPoints[touch.identifier].released = true;
            }
        }
    }.bind(this), { passive: false });

    this.addController();
}

Input.prototype.setTouchPositionFromTouch = function(touchPoint, touch, canvasBounds) {
    var x = ((touch.clientX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left)) * renderer.size.x;
    var y = ((touch.clientY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top)) * renderer.size.y;
    touchPoint.position.set(x, y);
}

Input.prototype.checkTouchRegion = function(fromX, fromY, toX, toY) {
    for(var i = 0; i < this.touchPoints.length; ++i) {
        var point = this.touchPoints[i];
        var p = point.position;
        if(point.value && p.x > fromX && p.x < toX && p.y > fromY && p.y < toY) {
            return true;
        }
    }
    return false;
}

Input.prototype.checkTouchRegionPressed = function(fromX, fromY, toX, toY) {
    for(var i = 0; i < this.touchPoints.length; ++i) {
        var point = this.touchPoints[i];
        var p = point.position;
        if(point.pressed && p.x > fromX && p.x < toX && p.y > fromY && p.y < toY) {
            return true;
        }
    }
    return false;
}

Input.prototype.checkTouchRegionReleased = function(fromX, fromY, toX, toY) {
    for(var i = 0; i < this.touchPoints.length; ++i) {
        var point = this.touchPoints[i];
        var p = point.position;
        if(point.released && p.x > fromX && p.x < toX && p.y > fromY && p.y < toY) {
            return true;
        }
    }
    return false;
}

Input.prototype.addController = function() {
    var controller = new Controller();
    controller.applyDefaultBindings();
    this.controllers.push(controller);
    return this.controllers.length - 1;
}

Input.prototype.getController = function(index) {
    index = index === undefined ? 0 : index;
    return this.controllers[index];
}

Input.prototype.beginFrame = function() {
    for(var i = 0; i < this.controllers.length; ++i) {
        this.controllers[i].update(this);
    } 
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
    for(var i = 0; i < this.touchPoints.length; ++i) {
        var touchPoint = this.touchPoints[i];
        touchPoint.pressed = false;
        touchPoint.released = false;
    }
    
    this.mouseDeltaPosition.set(this.mousePosition);
    this.mouseDeltaPosition.subtract(this.mouseLastPosition);
    this.mouseLastPosition.set(this.mousePosition);
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
    this.onFinish = null;
    this.callbackExecuted = false;
    this.color = Color.Black;
    this.type = TRANSITION_FADE;
}

TransitionSystem.prototype.begin = function(onChange, onFinish) {
    this.onChange = onChange;
    this.onFinish = onFinish;
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
            if(this.onFinish) {
                this.onFinish();
                this.onFinish = null;
            }
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

Scene.prototype.getAllOverlaps = function(entity, type, offset) {
    var output = [];
    var entities = this.entityTypeMap[type];
    if(entities) {
        for(var i = 0; i < entities.length; ++i) {
            var other = entities[i];
            if(entity != other) {
                if(entity.checkOverlapWith(other, offset)) {
                    output.push(other);
                }
            }
        }
    }
    return output;
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

Scene.prototype.clear = function() {
    this.clearEntities();
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
    this.maxFrameSkip = 8;
    this.frameRateTarget = 60;
    this.frameTimer = 0;
    this.fpsCounter = 0;
    this.fps = this.frameRateTarget;
    this.fpsTimer = 0;
    this.deltaTime = 0;
    this.maxDeltaTime = 1 / 10;
    this.lastTime = null;
    
    this.debugMode = false;
}

Game.prototype.start = function() {
    this.tick();
}

Game.prototype.setFixedFrameRate = function(frameRateTarget, maxFrameSkip) {
    this.hasFixedFrameRate = true;
    this.frameRateTarget = frameRateTarget ? frameRateTarget : this.frameRateTarget;
    this.maxFrameSkip = maxFrameSkip ? maxFrameSkip : this.maxFrameSkip;
}

Game.prototype.setVariableFrameRate = function(maxDeltaTime) {
    this.hasFixedFrameRate = false;
    this.maxDeltaTime = maxDeltaTime ? maxDeltaTime : this.maxDeltaTime;
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

    input.beginFrame();

    if(this.scene) {
        this.scene.buildTypeMap();
    }

    if(this.hasFixedFrameRate) {
        this.frameTimer += deltaTime;
        this.deltaTime = 1.0 / this.frameRateTarget;

        var skips = 0;
        if(this.frameTimer >= this.deltaTime) {
            while(this.frameTimer >= this.deltaTime) {
                if(skips > 0) {
                    this.postDraw();
                    input.endFrame();
                }
                this.frameTimer -= this.deltaTime;
                this.update();
                input.endFrame();
                if(skips++ > this.maxFrameSkip) {
                    this.frameTimer = 0;
                }
            }
            this.draw();
            this.fpsCounter++;
            this.postDraw();
            input.endFrame();
        }
    } else {
        this.deltaTime = deltaTime;
        this.update();
        this.draw();
        this.postDraw();
        input.endFrame();
        this.fpsCounter++;
    }

    this.fpsTimer += deltaTime;
    if(this.fpsTimer > 1) {
        this.fpsTimer -= 1;
        this.fps = this.fpsCounter;
        this.fpsCounter = 0;
        if(this.fpsTimer > 1) {
            this.fpsTimer = 0;
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
    renderer.update(this.deltaTime);
}

Game.prototype.draw = function() {
    renderer.begin();

    renderer.save();
    renderer.applyCameraTranformation();
    if(this.scene) {
        this.scene.draw();
    }
    renderer.flush();
    renderer.restore();

    this.transition.draw();

    if(this.scene && this.debugMode) {
        renderer.drawText(16, 16, "Entity count: " + this.scene.entities.length + "   Ease count: " + ease.items.length + "   Fps: " + this.fps, Color.White, undefined, -10000);
    }

    renderer.end();
}

Game.prototype.postDraw = function() {
    if(this.scene) {
        this.scene.resolveEntityChanges();
    }
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
    } else if(other instanceof Circle) {
        if(other.x >= this.x && other.y >= this.y && other.x <= this.x + this.width && other.y <= this.y + this.height) {
            return true;
        } else {
            var closestX = other.x;
            var closestY = other.y;
            closestX = Utils.clamp(closestX, this.x, this.x + this.width);
            closestY = Utils.clamp(closestY, this.y, this.y + this.height);

            var dx = closestX - other.x;
            var dy = closestY - other.y;
            var dr = other.radius;
            return (dx * dx + dy * dy < dr * dr);
        }
    } else if(other instanceof Grid) {
        return other.checkOverlap(this);
    } else {
        console.warn("Unsupported overlap check");
    }
    return false;
}

Rectangle.prototype.checkCollision = function(other, positionDelta, intersectionPoint) {
    console.warn("Unsupported collision check");
}

Rectangle.prototype.getCenter = function() {
    return new Vector2(this.x + this.width * 0.5, this.y + this.height * 0.5);
}

//-----------------------------------------------------------------------------

Grid.prototype.checkOverlap = function(other) {
    if(other instanceof Circle) {
        var fx = Utils.clamp(Math.floor((other.x - other.radius - this.x) / this.rectangle.width), 0, this.width);
        var fy = Utils.clamp(Math.floor((other.y - other.radius - this.y) / this.rectangle.height), 0, this.height);
        var tx = Utils.clamp(Math.ceil((other.x + other.radius - this.x) / this.rectangle.width), 0, this.width);
        var ty = Utils.clamp(Math.ceil((other.y + other.radius - this.y) / this.rectangle.height), 0, this.height);
        for(var y = fy; y < ty; ++y) {
            for(var x = fx; x < tx; ++x) {
                if(this.get(x, y)) {
                    this.rectangle.x = this.x + x * this.rectangle.width;
                    this.rectangle.y = this.y + y * this.rectangle.height;
                    if(this.rectangle.checkOverlap(other)) {
                        return true;
                    }
                }
            }
        }
    } else if(other instanceof Rectangle) {
        var fx = Utils.clamp(Math.floor((other.x - this.x) / this.rectangle.width), 0, this.width);
        var fy = Utils.clamp(Math.floor((other.y - this.y) / this.rectangle.height), 0, this.height);
        var tx = Utils.clamp(Math.ceil((other.x + other.width - this.x) / this.rectangle.width), 0, this.width);
        var ty = Utils.clamp(Math.ceil((other.y + other.height - this.y) / this.rectangle.height), 0, this.height);
        for(var y = fy; y < ty; ++y) {
            for(var x = fx; x < tx; ++x) {
                if(this.get(x, y)) {
                    this.rectangle.x = this.x + x * this.rectangle.width;
                    this.rectangle.y = this.y + y * this.rectangle.height;
                    if(this.rectangle.checkOverlap(other)) {
                        return true;
                    }
                }
            }
        }
    } else {
        console.warn("Unsupported collision check");
    }
}

Grid.prototype.checkCollision = function(other, positionDelta, intersectionPoint) {
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
    } else if(other instanceof Rectangle) {
        return other.checkOverlap(this);
    } else if(other instanceof Grid) {
        return other.checkOverlap(this);
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
    this.acceleration = new Vector2(0, 0);
    this.friction = 0;
    this.velocityLimit = null;
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

Entity.prototype.getAllOverlaps = function(type, offset) {
    return this.scene.getAllOverlaps(this, type, offset);
}

Entity.prototype.moveToContact = function(other, direction, adjustVelocity) {
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
    } else if(this.collisionVolume instanceof Circle && other.collisionVolume instanceof Rectangle) {
        var c = this.collisionVolume;
        var r = other.collisionVolume;
        var closestX = c.x + this.position.x;
        var closestY = c.y + this.position.y;
        var rLeft = r.x + other.position.x;
        var rRight = r.x + other.position.x + r.width;
        var rTop = r.y + other.position.y;
        var rBottom = r.y + other.position.y + r.height;
        var epsilon = 0.001;

        closestX = Utils.clamp(closestX, rLeft, rRight);
        closestY = Utils.clamp(closestY, rTop, rBottom);

        var inside = false;
        if(closestX != rLeft && closestX != rRight && closestY != rTop && closestY != rBottom) {
            inside = true;
            var closestDistance = Utils.distance(closestX, closestY, rLeft, closestY);
            var newClosestX = rLeft;
            var newClosestY = closestY;

            var distance = Utils.distance(closestX, closestY, rRight, closestY)
            if(distance < closestDistance) {
                closestDistance = distance;
                newClosestX = rRight;
                newClosestY = closestY;
            }

            var distance = Utils.distance(closestX, closestY, closestX, rTop)
            if(distance < closestDistance) {
                closestDistance = distance;
                newClosestX = closestX;
                newClosestY = rTop;
            }

            var distance = Utils.distance(closestX, closestY, closestX, rBottom)
            if(distance < closestDistance) {
                closestDistance = distance;
                newClosestX = closestX;
                newClosestY = rBottom;
            }

            closestX = newClosestX;
            closestY = newClosestY;
        }

        if(adjustVelocity) {
            // TODO: This is a big ol hack. Should really be projecting against the edge normal but I'm too lazy right now.
            if(closestX == rLeft && this.velocity.x > 0) {
                this.velocity.x = 0;
            } else if(closestX == rRight && this.velocity.x < 0) {
                this.velocity.x = 0;
            } else if(closestY == rTop && this.velocity.y > 0) {
                this.velocity.y = 0;
            } else if(closestY == rBottom && this.velocity.y < 0) {
                this.velocity.y = 0;
            }
        }
        
        this.position.set(this.position.x + c.x - closestX, this.position.y + c.y - closestY)
                     .normalize().scale((c.radius + epsilon) * (inside ? -1 : 1))
                     .add(closestX - c.x, closestY - c.y);
    } else if((this.collisionVolume instanceof Circle || this.collisionVolume instanceof Rectangle) && other.collisionVolume instanceof Grid) {
        var initialPosition = this.position.clone();
        var positions = [];
        var a = this.collisionVolume;
        var b = other.collisionVolume;

        if(this.collisionVolume instanceof Circle) {
            var fx = Utils.clamp(Math.floor((this.position.x + a.x - a.radius - b.x - other.position.x) / b.rectangle.width), 0, b.width);
            var fy = Utils.clamp(Math.floor((this.position.y + a.y - a.radius - b.y - other.position.y) / b.rectangle.height), 0, b.height);
            var tx = Utils.clamp(Math.ceil((this.position.x + a.x + a.radius - b.x - other.position.x) / b.rectangle.width), 0, b.width);
            var ty = Utils.clamp(Math.ceil((this.position.y + a.y + a.radius - b.y - other.position.y) / b.rectangle.height), 0, b.height);
        } else { // Must be a Rectangle
            var fx = Utils.clamp(Math.floor((this.position.x + a.x - b.x - other.position.x) / b.rectangle.width), 0, b.width);
            var fy = Utils.clamp(Math.floor((this.position.y + a.y - b.y - other.position.y) / b.rectangle.height), 0, b.height);
            var tx = Utils.clamp(Math.ceil((this.position.x + a.x + a.width - b.x - other.position.x) / b.rectangle.width), 0, b.width);
            var ty = Utils.clamp(Math.ceil((this.position.y + a.y + a.height - b.y - other.position.y) / b.rectangle.height), 0, b.height);
        }
        
        for(var y = fy; y < ty; ++y) {
            for(var x = fx; x < tx; ++x) {
                if(b.get(x, y)) {
                    var width = b.rectangle.width;
                    var height = b.rectangle.height;
                    b.rectangle.x = b.x + x * b.rectangle.width;
                    b.rectangle.y = b.y + y * b.rectangle.height;
                    // Grow the rectangle to account for the janky collision detection
                    // if two rectangles touch each other
                    var rw = b.rectangle.width;
                    var rh = b.rectangle.height;
                    var w = b.get(x - 1, y);
                    var e = b.get(x + 1, y);
                    var n = b.get(x, y - 1);
                    var s = b.get(x, y + 1);
                    if(w) {
                        b.rectangle.x -= rw * 0.5;
                        b.rectangle.width += rw * 0.5;
                    }
                    if(e) {
                        b.rectangle.width += rw * 0.5;
                    }
                    if(n) {
                        b.rectangle.y -= rh * 0.5;
                        b.rectangle.height += rh * 0.5;
                    }
                    if(s) {
                        b.rectangle.height += rh * 0.5;
                    }
                    other.collisionVolume = b.rectangle;
                    this.moveToContact(other, direction, adjustVelocity);
                    other.collisionVolume = b;
                    positions.push(this.position.clone());
                    // Restore rectangle size after growth
                    b.rectangle.width = width;
                    b.rectangle.height = height;
                }
            }
        }
        if(positions.length > 0) {
            var resultPosition = positions[0];
            var resultDistance = initialPosition.distance(positions[0]);
            for(var i = 1; i < positions.length; ++i) {
                var distance = initialPosition.distance(positions[i]);
                if(distance < resultDistance) {
                    resultPosition = positions[i];
                    resultDistance = distance;
                }
            }
            this.position = resultPosition;
        }
    } else {
        console.warn("moveToContact not implemented for this collision volume combination");
    }
}

Entity.prototype.init = function() {

}

Entity.prototype.update = function(deltaTime) {
    // TODO: Too much object cloning for an every frame, every entity method
    var startingAcceleration = this.acceleration.clone();
    if(this.velocity.lengthSquared() > 0 || this.acceleration.lengthSquared() > 0) {
        // This is not perfect but the minor flaw when accelerating from 0 should never be noticable
        var friction = Math.min(this.velocity.length() / deltaTime, this.friction);
        this.acceleration.subtract(this.velocity.clone().normalize().scale(friction));
    }

    var startingVelocity = this.velocity.clone();

    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;

    if(this.velocity.length() > this.velocityLimit) {
        this.velocity.normalize().scale(this.velocityLimit);
    }

    var actualAcceleration = this.velocity.clone().subtract(startingVelocity);

    this.position.x += this.velocity.x * deltaTime - 0.5 * actualAcceleration.x * deltaTime * deltaTime;
    this.position.y += this.velocity.y * deltaTime - 0.5 * actualAcceleration.y * deltaTime * deltaTime;

    this.acceleration = startingAcceleration;
}

Entity.prototype.draw = function() {
    // TODO: Draw the collision volume here
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
