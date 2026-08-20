const GLB_MAGIC = 0x46546c67
const JSON_CHUNK = 0x4e4f534a
const BIN_CHUNK = 0x004e4942

const COMPONENT_BYTES = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
}

const TYPE_COMPONENTS = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function identity() {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ])
}

function multiply(a, b) {
  const out = new Float32Array(16)
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3]
    }
  }
  return out
}

function translation(x, y, z) {
  const out = identity()
  out[12] = x
  out[13] = y
  out[14] = z
  return out
}

function scaling(x, y, z) {
  const out = identity()
  out[0] = x
  out[5] = y
  out[10] = z
  return out
}

function rotationX(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ])
}

function rotationY(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ])
}

function rotationZ(angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ])
}

function composeTRS(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) {
    return new Float32Array(node.matrix)
  }

  const [tx, ty, tz] = node.translation || [0, 0, 0]
  const [qx, qy, qz, qw] = node.rotation || [0, 0, 0, 1]
  const [sx, sy, sz] = node.scale || [1, 1, 1]

  const x2 = qx + qx
  const y2 = qy + qy
  const z2 = qz + qz
  const xx = qx * x2
  const xy = qx * y2
  const xz = qx * z2
  const yy = qy * y2
  const yz = qy * z2
  const zz = qz * z2
  const wx = qw * x2
  const wy = qw * y2
  const wz = qw * z2

  return new Float32Array([
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ])
}

function transformPoint(matrix, x, y, z) {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ]
}

function perspective(fovRadians, aspect, near, far) {
  const f = 1 / Math.tan(fovRadians / 2)
  const nf = 1 / (near - far)
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ])
}

function parseGlb(arrayBuffer) {
  const view = new DataView(arrayBuffer)
  if (view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error('Invalid GLB file')
  }

  let offset = 12
  let json = null
  let bin = null

  while (offset < arrayBuffer.byteLength) {
    const chunkLength = view.getUint32(offset, true)
    const chunkType = view.getUint32(offset + 4, true)
    const chunkStart = offset + 8

    if (chunkType === JSON_CHUNK) {
      const text = new TextDecoder().decode(
        new Uint8Array(arrayBuffer, chunkStart, chunkLength),
      )
      json = JSON.parse(text.replace(/\u0000+$/g, '').trim())
    } else if (chunkType === BIN_CHUNK) {
      bin = new Uint8Array(arrayBuffer, chunkStart, chunkLength)
    }

    offset = chunkStart + chunkLength
  }

  if (!json || !bin) {
    throw new Error('GLB is missing JSON or BIN chunks')
  }

  return { json, bin }
}

function readComponent(dataView, offset, componentType, normalized) {
  let value
  switch (componentType) {
    case 5120:
      value = dataView.getInt8(offset)
      return normalized ? Math.max(value / 127, -1) : value
    case 5121:
      value = dataView.getUint8(offset)
      return normalized ? value / 255 : value
    case 5122:
      value = dataView.getInt16(offset, true)
      return normalized ? Math.max(value / 32767, -1) : value
    case 5123:
      value = dataView.getUint16(offset, true)
      return normalized ? value / 65535 : value
    case 5125:
      value = dataView.getUint32(offset, true)
      return value
    case 5126:
      return dataView.getFloat32(offset, true)
    default:
      throw new Error(`Unsupported glTF component type: ${componentType}`)
  }
}

function readAccessor(json, bin, accessorIndex, { indices = false } = {}) {
  const accessor = json.accessors[accessorIndex]
  const bufferView = json.bufferViews[accessor.bufferView]
  const components = TYPE_COMPONENTS[accessor.type]
  const componentBytes = COMPONENT_BYTES[accessor.componentType]
  const stride = bufferView.byteStride || components * componentBytes
  const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0)
  const dataView = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)

  const result = indices
    ? new Uint32Array(accessor.count * components)
    : new Float32Array(accessor.count * components)

  for (let item = 0; item < accessor.count; item += 1) {
    const itemStart = start + item * stride
    for (let component = 0; component < components; component += 1) {
      result[item * components + component] = readComponent(
        dataView,
        itemStart + component * componentBytes,
        accessor.componentType,
        Boolean(accessor.normalized),
      )
    }
  }

  return result
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile failed: ${log}`)
  }
  return shader
}

function createProgram(gl) {
  const vertexSource = `#version 300 es
    precision highp float;
    in vec3 a_position;
    in vec3 a_normal;
    uniform mat4 u_viewProjection;
    uniform mat4 u_global;
    uniform mat4 u_node;
    out vec3 v_normal;
    out vec3 v_world;

    void main() {
      mat4 model = u_global * u_node;
      vec4 world = model * vec4(a_position, 1.0);
      v_world = world.xyz;
      v_normal = normalize(mat3(model) * a_normal);
      gl_Position = u_viewProjection * world;
    }
  `

  const fragmentSource = `#version 300 es
    precision highp float;
    in vec3 v_normal;
    in vec3 v_world;
    uniform vec4 u_color;
    out vec4 outColor;

    void main() {
      vec3 n = normalize(v_normal);
      vec3 lightA = normalize(vec3(-0.45, 0.9, 0.75));
      vec3 lightB = normalize(vec3(0.8, 0.25, 0.4));
      float key = max(dot(n, lightA), 0.0);
      float fill = max(dot(n, lightB), 0.0);
      vec3 viewDir = normalize(vec3(0.0, 0.0, 5.2) - v_world);
      float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.25);
      vec3 base = u_color.rgb;
      vec3 lit = base * (0.54 + key * 0.38 + fill * 0.12);
      lit += vec3(1.0, 0.55, 0.72) * rim * 0.08;
      outColor = vec4(lit, u_color.a);
    }
  `

  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Shader link failed: ${log}`)
  }

  return program
}

function buildSceneItems(json, bin) {
  const items = []
  const sceneIndex = json.scene ?? 0
  const scene = json.scenes?.[sceneIndex]
  const rootNodes = scene?.nodes || []
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]

  const visit = (nodeIndex, parentMatrix) => {
    const node = json.nodes[nodeIndex]
    const local = composeTRS(node)
    const world = multiply(parentMatrix, local)

    if (Number.isInteger(node.mesh)) {
      const mesh = json.meshes[node.mesh]
      for (const primitive of mesh.primitives) {
        if ((primitive.mode ?? 4) !== 4) continue

        const positions = readAccessor(json, bin, primitive.attributes.POSITION)
        const normals = primitive.attributes.NORMAL !== undefined
          ? readAccessor(json, bin, primitive.attributes.NORMAL)
          : new Float32Array(positions.length)
        const indices = primitive.indices !== undefined
          ? readAccessor(json, bin, primitive.indices, { indices: true })
          : Uint32Array.from({ length: positions.length / 3 }, (_, index) => index)

        for (let index = 0; index < positions.length; index += 3) {
          const point = transformPoint(
            world,
            positions[index],
            positions[index + 1],
            positions[index + 2],
          )
          for (let axis = 0; axis < 3; axis += 1) {
            min[axis] = Math.min(min[axis], point[axis])
            max[axis] = Math.max(max[axis], point[axis])
          }
        }

        const material = json.materials?.[primitive.material ?? -1]
        const color = material?.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1]

        items.push({
          positions,
          normals,
          indices,
          nodeMatrix: world,
          color,
        })
      }
    }

    for (const child of node.children || []) {
      visit(child, world)
    }
  }

  for (const nodeIndex of rootNodes) visit(nodeIndex, identity())

  if (!items.length) throw new Error('The GLB contains no triangle meshes')

  return { items, min, max }
}

export class Kitty3D {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.options = {
      modelUrl: '/assets/models/hello-kitty.glb',
      baseRotationY: 0,
      baseRotationX: -0.04,
      cameraZ: 5.2,
      fitSize: 2.75,
      verticalOffset: -0.02,
      ...options,
    }
    this.gl = null
    this.program = null
    this.buffers = []
    this.viewProjection = identity()
    this.center = [0, 0, 0]
    this.scale = 1
    this.pointer = { x: 0, y: 0 }
    this.targetPointer = { x: 0, y: 0 }
    this.scrollInfluence = 0
    this.visible = true
    this.ready = false
    this.failed = false
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.frame = 0
    this.timeOrigin = performance.now()
    this.resizeObserver = null
    this.intersectionObserver = null
    this.onResize = this.onResize.bind(this)
    this.render = this.render.bind(this)
  }

  async init() {
    try {
      const gl = this.canvas.getContext('webgl2', {
        antialias: true,
        alpha: true,
        premultipliedAlpha: true,
        powerPreference: 'high-performance',
      })
      if (!gl) throw new Error('WebGL2 is unavailable')
      this.gl = gl
      this.program = createProgram(gl)
      this.locations = {
        position: gl.getAttribLocation(this.program, 'a_position'),
        normal: gl.getAttribLocation(this.program, 'a_normal'),
        viewProjection: gl.getUniformLocation(this.program, 'u_viewProjection'),
        global: gl.getUniformLocation(this.program, 'u_global'),
        node: gl.getUniformLocation(this.program, 'u_node'),
        color: gl.getUniformLocation(this.program, 'u_color'),
      }

      const response = await fetch(this.options.modelUrl)
      if (!response.ok) throw new Error(`Model request failed (${response.status})`)
      const { json, bin } = parseGlb(await response.arrayBuffer())
      const { items, min, max } = buildSceneItems(json, bin)

      this.center = [
        (min[0] + max[0]) / 2,
        (min[1] + max[1]) / 2,
        (min[2] + max[2]) / 2,
      ]
      const size = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2])
      this.scale = this.options.fitSize / Math.max(size, 0.0001)

      for (const item of items) {
        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)

        const positionBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, item.positions, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(this.locations.position)
        gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0)

        const normalBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, item.normals, gl.STATIC_DRAW)
        gl.enableVertexAttribArray(this.locations.normal)
        gl.vertexAttribPointer(this.locations.normal, 3, gl.FLOAT, false, 0, 0)

        const indexBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, item.indices, gl.STATIC_DRAW)

        this.buffers.push({
          vao,
          positionBuffer,
          normalBuffer,
          indexBuffer,
          count: item.indices.length,
          nodeMatrix: item.nodeMatrix,
          color: item.color,
        })
      }

      gl.bindVertexArray(null)
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.LEQUAL)
      gl.disable(gl.CULL_FACE)
      gl.clearColor(0, 0, 0, 0)

      this.resizeObserver = new ResizeObserver(this.onResize)
      this.resizeObserver.observe(this.canvas)
      this.intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          this.visible = entry.isIntersecting
          if (this.visible && !this.frame) this.frame = requestAnimationFrame(this.render)
        },
        { rootMargin: '120px' },
      )
      this.intersectionObserver.observe(this.canvas)

      this.onResize()
      this.ready = true
      this.canvas.dataset.modelReady = 'true'
      this.canvas.dispatchEvent(new CustomEvent('kitty:model-ready'))
      this.frame = requestAnimationFrame(this.render)
    } catch (error) {
      this.failed = true
      this.canvas.dataset.modelFailed = 'true'
      this.canvas.dispatchEvent(new CustomEvent('kitty:model-error', { detail: error }))
      console.warn('[Kitty3D fallback]', error)
    }
  }

  setPointer(x, y) {
    if (this.reducedMotion) return
    this.targetPointer.x = clamp(x, -1, 1)
    this.targetPointer.y = clamp(y, -1, 1)
  }

  setScroll(progress) {
    if (this.reducedMotion) return
    this.scrollInfluence = clamp(progress, -1, 1)
  }

  onResize() {
    if (!this.gl) return
    const rect = this.canvas.getBoundingClientRect()
    const compact = window.matchMedia('(max-width: 720px)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.15 : 1.5)
    const width = Math.max(1, Math.round(rect.width * dpr))
    const height = Math.max(1, Math.round(rect.height * dpr))

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }

    this.gl.viewport(0, 0, width, height)
    const projection = perspective(Math.PI / 5.1, width / height, 0.1, 100)
    const view = translation(0, 0, -this.options.cameraZ)
    this.viewProjection = multiply(projection, view)
  }

  globalMatrix(time) {
    const auto = this.reducedMotion ? 0 : Math.sin(time * 0.00075) * 0.045
    const tiltX = this.options.baseRotationX + this.pointer.y * 0.11 + this.scrollInfluence * 0.035
    const tiltY = this.options.baseRotationY + this.pointer.x * 0.2 + this.scrollInfluence * 0.08
    const tiltZ = auto * 0.35
    const bob = this.reducedMotion ? 0 : Math.sin(time * 0.0011) * 0.055

    const center = translation(-this.center[0], -this.center[1], -this.center[2])
    const scale = scaling(this.scale, this.scale, this.scale)
    const rotate = multiply(rotationZ(tiltZ), multiply(rotationY(tiltY), rotationX(tiltX)))
    const move = translation(0, this.options.verticalOffset + bob, 0)
    return multiply(move, multiply(rotate, multiply(scale, center)))
  }

  render(time) {
    this.frame = 0
    if (!this.gl || !this.program || !this.ready || !this.visible) return

    const gl = this.gl
    this.pointer.x = lerp(this.pointer.x, this.targetPointer.x, 0.055)
    this.pointer.y = lerp(this.pointer.y, this.targetPointer.y, 0.055)

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(this.program)
    gl.uniformMatrix4fv(this.locations.viewProjection, false, this.viewProjection)
    gl.uniformMatrix4fv(this.locations.global, false, this.globalMatrix(time))

    for (const item of this.buffers) {
      gl.bindVertexArray(item.vao)
      gl.uniformMatrix4fv(this.locations.node, false, item.nodeMatrix)
      gl.uniform4fv(this.locations.color, item.color)
      gl.drawElements(gl.TRIANGLES, item.count, gl.UNSIGNED_INT, 0)
    }

    gl.bindVertexArray(null)
    this.frame = requestAnimationFrame(this.render)
  }

  destroy() {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.resizeObserver?.disconnect()
    this.intersectionObserver?.disconnect()
    if (!this.gl) return
    for (const item of this.buffers) {
      this.gl.deleteBuffer(item.positionBuffer)
      this.gl.deleteBuffer(item.normalBuffer)
      this.gl.deleteBuffer(item.indexBuffer)
      this.gl.deleteVertexArray(item.vao)
    }
    this.gl.deleteProgram(this.program)
  }
}
