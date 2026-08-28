import React, { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

export default function ThreeScene({ stage, ceremonyData, role }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const objectsRef = useRef({})
  const animFrameRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a0011)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.set(0, 2, 8)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const ambientLight = new THREE.AmbientLight(0x331100, 0.5)
    scene.add(ambientLight)

    const diyaLight = new THREE.PointLight(0xff6600, 2, 20)
    diyaLight.position.set(0, 3, 2)
    scene.add(diyaLight)
    objectsRef.current.diyaLight = diyaLight

    const warmLight = new THREE.PointLight(0xff3300, 1, 15)
    warmLight.position.set(-3, 1, 0)
    scene.add(warmLight)

    const warmLight2 = new THREE.PointLight(0xff3300, 1, 15)
    warmLight2.position.set(3, 1, 0)
    scene.add(warmLight2)

    // Thali / plate
    const thaliGeo = new THREE.CircleGeometry(2, 32)
    const thaliMat = new THREE.MeshStandardMaterial({
      color: 0xd4a017,
      metalness: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide
    })
    const thali = new THREE.Mesh(thaliGeo, thaliMat)
    thali.rotation.x = -Math.PI / 2
    thali.position.set(0, 0.5, 0)
    scene.add(thali)
    objectsRef.current.thali = thali

    // Diya
    const diyaBase = new THREE.CylinderGeometry(0.15, 0.2, 0.15, 16)
    const diyaMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.7 })
    const diya = new THREE.Mesh(diyaBase, diyaMat)
    diya.position.set(-0.8, 0.65, 0)
    scene.add(diya)

    // Flame
    const flameGeo = new THREE.SphereGeometry(0.08, 8, 8)
    flameGeo.scale(1, 1.8, 1)
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8800 })
    const flame = new THREE.Mesh(flameGeo, flameMat)
    flame.position.set(-0.8, 0.85, 0)
    scene.add(flame)
    objectsRef.current.flame = flame

    const flameCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffaa })
    )
    flameCore.position.set(-0.8, 0.83, 0)
    scene.add(flameCore)
    objectsRef.current.flameCore = flameCore

    // Rakhi on thali
    const rakhiGeo = new THREE.TorusGeometry(0.3, 0.05, 8, 24)
    const rakhiMat = new THREE.MeshStandardMaterial({
      color: 0xff1493,
      metalness: 0.5,
      roughness: 0.4
    })
    const rakhi = new THREE.Mesh(rakhiGeo, rakhiMat)
    rakhi.position.set(0.5, 0.65, 0)
    rakhi.rotation.x = -Math.PI / 2
    scene.add(rakhi)
    objectsRef.current.rakhi = rakhi

    // Flower petals
    const petalGeo = new THREE.SphereGeometry(0.08, 8, 8)
    petalGeo.scale(1.2, 0.5, 1)
    const petalColors = [0xff4444, 0xff8800, 0xffaa00, 0xff6699, 0xff2222]
    const petals = []
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: petalColors[i % petalColors.length]
      })
      const petal = new THREE.Mesh(petalGeo, mat)
      const angle = (i / 12) * Math.PI * 2
      const r = 0.5 + Math.random() * 1
      petal.position.set(
        Math.cos(angle) * r,
        0.6 + Math.random() * 0.3,
        Math.sin(angle) * r
      )
      petal.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      scene.add(petal)
      petals.push(petal)
    }
    objectsRef.current.petals = petals

    // Brother avatar (sphere)
    const brotherGeo = new THREE.SphereGeometry(0.4, 16, 16)
    const brotherMat = new THREE.MeshStandardMaterial({ color: 0x4488cc })
    const brother = new THREE.Mesh(brotherGeo, brotherMat)
    brother.position.set(2.5, 1.5, 0)
    scene.add(brother)
    objectsRef.current.brother = brother

    // Sister avatar (sphere)
    const sisterGeo = new THREE.SphereGeometry(0.4, 16, 16)
    const sisterMat = new THREE.MeshStandardMaterial({ color: 0xff6699 })
    const sister = new THREE.Mesh(sisterGeo, sisterMat)
    sister.position.set(-2.5, 1.5, 0)
    scene.add(sister)
    objectsRef.current.sister = sister

    // Tikka dot
    const tikkaGeo = new THREE.CircleGeometry(0.08, 16)
    const tikkaMat = new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false })
    const tikka = new THREE.Mesh(tikkaGeo, tikkaMat)
    tikka.position.set(2.5, 1.7, 0.35)
    scene.add(tikka)
    objectsRef.current.tikka = tikka

    // Rakhi on wrist
    const wristRakhiGeo = new THREE.TorusGeometry(0.15, 0.03, 8, 16)
    const wristRakhiMat = new THREE.MeshStandardMaterial({
      color: 0xff1493,
      metalness: 0.5,
      visible: false
    })
    const wristRakhi = new THREE.Mesh(wristRakhiGeo, wristRakhiMat)
    wristRakhi.position.set(2.5, 1.2, 0.3)
    wristRakhi.rotation.x = Math.PI / 2
    scene.add(wristRakhi)
    objectsRef.current.wristRakhi = wristRakhi

    // Particles system
    const particleCount = 50
    const particleGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const pColors = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8
      positions[i * 3 + 1] = Math.random() * 5
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4
      const c = new THREE.Color(petalColors[i % petalColors.length])
      pColors[i * 3] = c.r
      pColors[i * 3 + 1] = c.g
      pColors[i * 3 + 2] = c.b
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3))
    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)
    objectsRef.current.particles = particles

    let time = 0
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate)
      time += 0.02

      // Animate flame
      if (flame) {
        flame.scale.y = 1 + Math.sin(time * 8) * 0.2
        flame.scale.x = 1 + Math.sin(time * 6) * 0.1
        flame.position.y = 0.85 + Math.sin(time * 10) * 0.02
      }
      if (flameCore) {
        flameCore.scale.y = 1 + Math.sin(time * 12) * 0.15
      }

      // Diya light flicker
      if (diyaLight) {
        diyaLight.intensity = 2 + Math.sin(time * 8) * 0.3
      }

      // Petal gentle float
      if (petals) {
        petals.forEach((p, i) => {
          p.position.y += Math.sin(time * 2 + i) * 0.001
          p.rotation.z += 0.003
        })
      }

      renderer.render(scene, camera)
    }
    animate()

    function handleResize() {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animFrameRef.current)
      renderer.dispose()
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    const objs = objectsRef.current
    if (!objs.thali) return

    switch (stage) {
      case 'aarti':
        if (ceremonyData?.angle !== undefined) {
          objs.thali.rotation.z = ceremonyData.angle
        }
        break

      case 'tikka':
        if (objs.tikka) objs.tikka.material.visible = true
        break

      case 'rakhi':
        if (objs.wristRakhi) objs.wristRakhi.material.visible = true
        if (objs.rakhi) objs.rakhi.material.visible = false
        break

      case 'celebration':
        if (objs.particles) {
          objs.particles.material.opacity = 1
          const pos = objs.particles.geometry.attributes.position.array
          for (let i = 0; i < pos.length; i += 3) {
            pos[i + 1] = Math.random() * 5
          }
          objs.particles.geometry.attributes.position.needsUpdate = true
        }
        break
    }
  }, [stage, ceremonyData])

  return <div ref={containerRef} className="three-container" />
}
