import * as THREE from 'three';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
        //  import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Optional

        let scene, camera, renderer, carModel, enemyCar;
        let ambientLight, directionalLight;
        let road, roadLines = [], kerbs = [];
        let buildings = [], streetLights = [], trafficLights = [];
        const roadWidth = 10;
        const roadLength = 200;
        const buildingSpacing = 15;
        const lightSpacing = 30;
        const numBuildings = Math.floor(roadLength / buildingSpacing);
        const numLights = Math.floor(roadLength / lightSpacing);
        const driveSpeed = 0.5; // Scenery scroll speed

        const enemyCarSpeed = 0.4; // Independent enemy speed

        const kerbHeight = 0.2;
        const kerbWidth = 0.3;

        // --- Game State ---
        let moveLeft = false;
        let moveRight = false;
        const carMoveSpeed = 0.15;
        let carBaseY = 0;
        let score = 0;
        let isGameOver = false;
        // --- End Game State ---

        // --- Points ---
        const points = [];
        const numPoints = 15;
        const pointValue = 10;
        let pointGeometry, pointMaterial;
        const pointRadius = 0.3;
        // --- End Points ---

        // --- UI Elements References ---
        const loadingScreen = document.getElementById('loading-screen');
        const scoreElement = document.getElementById('score');
        const gameOverElement = document.getElementById('game-over');
        // --- End UI Refs ---

        // --- Bounding Boxes ---
        let playerBox = new THREE.Box3();
        let enemyBox = new THREE.Box3();
        let pointBox = new THREE.Box3();
        // --- End Bounding Boxes ---

        const loadingManager = new THREE.LoadingManager();

        // Loading Manager Callbacks
        loadingManager.onLoad = () => { console.log("All resources loaded!"); loadingScreen.classList.add('hidden'); setTimeout(() => { if (loadingScreen) loadingScreen.style.display = 'none'; }, 600); };
        loadingManager.onError = (url) => { console.error(`There was an error loading ${url}`); loadingScreen.textContent = `Error loading: ${url}. Check console.`; loadingScreen.classList.remove('hidden'); loadingScreen.style.opacity = 1; };
        loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => { console.log(`Loading file: ${url} (${itemsLoaded}/${itemsTotal})`); const progress = Math.round((itemsLoaded / itemsTotal) * 100); loadingScreen.textContent = `Loading ${progress}%...`; };


        init();
        setupControls(); // Set up both keyboard and touch controls
        animate();

        function init() {
            // --- Basic Setup ---
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xa0d7e6);
            scene.fog = new THREE.Fog(0xa0d7e6, roadLength * 0.4, roadLength * 0.9);
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;
            document.getElementById('container').appendChild(renderer.domElement);

            // --- Lights ---
            ambientLight = new THREE.AmbientLight(0xffffff, 0.6); scene.add(ambientLight);
            directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); directionalLight.position.set(50, 100, 50); directionalLight.castShadow = true; directionalLight.shadow.mapSize.width = 2048; directionalLight.shadow.mapSize.height = 2048; directionalLight.shadow.camera.near = 0.5; directionalLight.shadow.camera.far = 500; directionalLight.shadow.camera.left = -roadLength / 2; directionalLight.shadow.camera.right = roadLength / 2; directionalLight.shadow.camera.top = roadLength / 2; directionalLight.shadow.camera.bottom = -roadLength / 2; scene.add(directionalLight);

            // --- Ground, Road, Lines, Kerbs ---
            const groundGeo = new THREE.PlaneGeometry(roadLength * 1.5, roadLength); const groundMat = new THREE.MeshStandardMaterial({ color: 0x55aa55, side: THREE.DoubleSide }); const ground = new THREE.Mesh(groundGeo, groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true; scene.add(ground);
            const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength); const roadMat = new THREE.MeshStandardMaterial({ color: 0x555555, side: THREE.DoubleSide }); road = new THREE.Mesh(roadGeo, roadMat); road.rotation.x = -Math.PI / 2; road.position.y = 0.0; road.receiveShadow = true; scene.add(road);
            const lineLength = 4; const lineGap = 4; const numLines = Math.floor(roadLength / (lineLength + lineGap)); const lineGeo = new THREE.PlaneGeometry(0.3, lineLength); const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
            for (let i = 0; i < numLines; i++) { const line = new THREE.Mesh(lineGeo, lineMat); line.rotation.x = -Math.PI / 2; line.position.y = 0.005; line.position.z = (roadLength / 2) - (lineLength / 2) - i * (lineLength + lineGap); line.receiveShadow = true; roadLines.push(line); scene.add(line); }
            function createKerbTexture() { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); canvas.width = 64; canvas.height = 16; const stripeWidth = 8; const colors = ['#ff0000', '#ffffff']; for (let i = 0; i < canvas.width / stripeWidth; i++) { ctx.fillStyle = colors[i % 2]; ctx.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height); } return new THREE.CanvasTexture(canvas); }
            const kerbTexture = createKerbTexture(); kerbTexture.wrapS = THREE.RepeatWrapping; kerbTexture.wrapT = THREE.ClampToEdgeWrapping; kerbTexture.repeat.set(roadLength / 4, 1);
            const kerbGeo = new THREE.BoxGeometry(kerbWidth, kerbHeight, roadLength); const kerbMat = new THREE.MeshStandardMaterial({ map: kerbTexture });
            const kerbLeft = new THREE.Mesh(kerbGeo, kerbMat); kerbLeft.position.set(-(roadWidth / 2) - (kerbWidth / 2), kerbHeight / 2, 0); kerbLeft.castShadow = true; kerbLeft.receiveShadow = true; scene.add(kerbLeft); kerbs.push(kerbLeft);
            const kerbRight = new THREE.Mesh(kerbGeo, kerbMat); kerbRight.position.set((roadWidth / 2) + (kerbWidth / 2), kerbHeight / 2, 0); kerbRight.castShadow = true; kerbRight.receiveShadow = true; scene.add(kerbRight); kerbs.push(kerbRight);

            // --- Buildings, Street Lights, Traffic Lights ---
            function createBuilding() { const height = Math.random() * 30 + 10; const width = Math.random() * 8 + 4; const depth = Math.random() * 8 + 4; const buildingGeo = new THREE.BoxGeometry(width, height, depth); const buildingMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(Math.random() * 0.8 + 0.1, Math.random() * 0.8 + 0.1, Math.random() * 0.8 + 0.1), roughness: 0.8, metalness: 0.1 }); const building = new THREE.Mesh(buildingGeo, buildingMat); building.position.y = height / 2; building.castShadow = true; building.receiveShadow = true; return building; }
            for (let i = 0; i < numBuildings; i++) { const buildingLeft = createBuilding(); const buildingRight = createBuilding(); const zPos = (roadLength / 2) - (buildingSpacing / 2) - i * buildingSpacing; const xOffsetLeft = roadWidth / 2 + kerbWidth + 1 + Math.random() * 5 + buildingLeft.geometry.parameters.width / 2; const xOffsetRight = roadWidth / 2 + kerbWidth + 1 + Math.random() * 5 + buildingRight.geometry.parameters.width / 2; buildingLeft.position.set(-xOffsetLeft, buildingLeft.position.y, zPos); buildingRight.position.set(xOffsetRight, buildingRight.position.y, zPos); buildings.push(buildingLeft, buildingRight); scene.add(buildingLeft); scene.add(buildingRight); }
            function createStreetLight() { const group = new THREE.Group(); const poleHeight = 6; const poleRadius = 0.1; const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight); const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.4 }); const pole = new THREE.Mesh(poleGeo, poleMat); pole.castShadow = true; pole.position.y = poleHeight/2; group.add(pole); const armLength = 1; const armGeo = new THREE.BoxGeometry(armLength, poleRadius * 1.5, poleRadius * 1.5); const arm = new THREE.Mesh(armGeo, poleMat); arm.position.set(0, poleHeight - poleRadius * 2, 0); group.add(arm); const lightFixtureGeo = new THREE.SphereGeometry(poleRadius * 2, 16, 8); const lightFixtureMat = new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffff00, emissiveIntensity: 0.5 }); const lightFixture = new THREE.Mesh(lightFixtureGeo, lightFixtureMat); lightFixture.position.set(0, poleHeight - poleRadius * 2, 0); group.add(lightFixture); group.userData.armLength = armLength; return group;}
            for (let i = 0; i < numLights; i++) { const lightLeft = createStreetLight(); const lightRight = createStreetLight(); const zPos = (roadLength / 2) - (lightSpacing / 2) - i * lightSpacing; const xPos = roadWidth / 2 + kerbWidth + 0.8; lightLeft.position.set(-xPos, 0, zPos); lightLeft.rotation.y = Math.PI / 2; lightLeft.children[1].position.x = -lightLeft.userData.armLength / 2; lightLeft.children[2].position.x = -lightLeft.userData.armLength; lightRight.position.set(xPos, 0, zPos); lightRight.rotation.y = -Math.PI / 2; lightRight.children[1].position.x = -lightRight.userData.armLength / 2; lightRight.children[2].position.x = -lightRight.userData.armLength; streetLights.push(lightLeft, lightRight); scene.add(lightLeft); scene.add(lightRight); }
            function createTrafficLight() { const group = new THREE.Group(); const poleHeight = 5; const poleRadius = 0.15; const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight); const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.5 }); const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = poleHeight / 2; pole.castShadow = true; group.add(pole); const housingWidth = 0.5; const housingHeight = 1.2; const housingDepth = 0.3; const housingGeo = new THREE.BoxGeometry(housingWidth, housingHeight, housingDepth); const housingMat = new THREE.MeshStandardMaterial({ color: 0x333333 }); const housing = new THREE.Mesh(housingGeo, housingMat); housing.position.y = poleHeight - housingHeight / 2; housing.castShadow = true; group.add(housing); const lightRadius = housingWidth * 0.25; const lightGeo = new THREE.SphereGeometry(lightRadius, 16, 8); const redMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xaa0000, emissiveIntensity: 1 }); const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xaaaa00, emissiveIntensity: 1 }); const greenMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00aa00, emissiveIntensity: 1 }); const redLight = new THREE.Mesh(lightGeo, redMat); redLight.position.set(0, housingHeight * 0.3, housingDepth / 2 + 0.01); housing.add(redLight); const yellowLight = new THREE.Mesh(lightGeo, yellowMat); yellowLight.position.set(0, 0, housingDepth / 2 + 0.01); housing.add(yellowLight); const greenLight = new THREE.Mesh(lightGeo, greenMat); greenLight.position.set(0, -housingHeight * 0.3, housingDepth / 2 + 0.01); housing.add(greenLight); return group; }
            const trafficLightLeft = createTrafficLight(); const trafficLightRight = createTrafficLight(); const trafficLightZ = roadLength * 0.4; const trafficLightX = roadWidth / 2 + kerbWidth + 0.5; trafficLightLeft.position.set(-trafficLightX, 0, trafficLightZ); trafficLightLeft.rotation.y = Math.PI / 2; trafficLightRight.position.set(trafficLightX, 0, trafficLightZ); trafficLightRight.rotation.y = -Math.PI / 2; trafficLights.push(trafficLightLeft, trafficLightRight); scene.add(trafficLightLeft); scene.add(trafficLightRight);

             // --- Points Setup ---
            pointGeometry = new THREE.SphereGeometry(pointRadius, 8, 8);
            pointMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xaaaa00, emissiveIntensity: 0.8 });
            for (let i = 0; i < numPoints; i++) { const point = new THREE.Mesh(pointGeometry, pointMaterial); point.castShadow = true; resetPointPosition(point, true); points.push(point); scene.add(point); }

            // --- Car Model Loading ---
            const loader = new GLTFLoader(loadingManager);
            const dracoLoader = new DRACOLoader(loadingManager);
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
            loader.setDRACOLoader(dracoLoader);
            const carUrl = 'https://threejs.org/examples/models/gltf/ferrari.glb';

            loader.load(carUrl, (gltf) => {
                carModel = gltf.scene;
                carModel.scale.set(0.8, 0.8, 0.8);
                const box = new THREE.Box3().setFromObject(carModel);
                carBaseY = -box.min.y + 0.01; // Adjusted base Y calculation
                carModel.position.set(0, carBaseY, 0);
                carModel.rotation.y = Math.PI;
                carModel.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
                scene.add(carModel);

                // Enemy Car Setup
                enemyCar = carModel.clone();
                enemyCar.traverse((node) => { if (node.isMesh) { const blueMaterial = node.material.clone(); blueMaterial.color.setHex(0x0000ff); node.material = blueMaterial; node.castShadow = true; node.receiveShadow = true; } });
                const initialEnemyX = (Math.random() < 0.5 ? -1 : 1) * roadWidth / 4;
                enemyCar.position.set(initialEnemyX, carBaseY, roadLength * 0.7);
                enemyCar.rotation.y = Math.PI;
                scene.add(enemyCar);
                console.log("Enemy car added and colored blue");

                // Set initial Camera position
                camera.position.set(0, carBaseY + 3, -7); // Position relative to carBaseY
                camera.lookAt(carModel.position.x, carBaseY + 1, carModel.position.z + 5); // Look relative to carBaseY

            }, undefined, (error) => {
                // Fallback (using carBaseY)
                console.error('An error happened loading the car model:', error); const fallbackGeo = new THREE.BoxGeometry(2, 1, 4); const fallbackMat = new THREE.MeshStandardMaterial({color: 0xff0000}); carModel = new THREE.Mesh(fallbackGeo, fallbackMat); carBaseY = 0.5 + 0.01; carModel.position.set(0, carBaseY, 0); carModel.castShadow = true; carModel.receiveShadow = true; scene.add(carModel); camera.position.set(0, carBaseY + 3, -7); camera.lookAt(carModel.position.x, carBaseY + 1, carModel.position.z + 5); loadingScreen.textContent = 'Error loading car model. Displaying fallback.'; loadingScreen.classList.remove('hidden'); loadingScreen.style.opacity = 1;
            });

            // --- Resize Listener ---
            window.addEventListener('resize', onWindowResize, false);
            // --- Initial Score Display ---
            updateScoreDisplay();
        }

        // --- Function to Set Up Controls (Keyboard & Touch) ---
        function setupControls() {
            // Keyboard Listeners
            window.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft = true;
        if (e.key === 'ArrowRight' || e.key === 'd') moveRight = true;
    });

    window.addEventListener('keyup', e => {
        if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft = false;
        if (e.key === 'ArrowRight' || e.key === 'd') moveRight = false;
    });
            // Touch Listeners for Buttons
            const leftButton = document.getElementById('left-button');
            const rightButton = document.getElementById('right-button');

            if (leftButton) {
                leftButton.addEventListener('touchstart', (e) => { if (!isGameOver) { e.preventDefault(); moveLeft = true; } }, { passive: false });
                leftButton.addEventListener('touchend', (e) => { e.preventDefault(); moveLeft = false; });
                leftButton.addEventListener('touchcancel', (e) => { e.preventDefault(); moveLeft = false; }); // Handle cancellation
            }
             if (rightButton) {
                rightButton.addEventListener('touchstart', (e) => { if (!isGameOver) { e.preventDefault(); moveRight = true; } }, { passive: false });
                rightButton.addEventListener('touchend', (e) => { e.preventDefault(); moveRight = false; });
                rightButton.addEventListener('touchcancel', (e) => { e.preventDefault(); moveRight = false; }); // Handle cancellation
            }
        }
        // --- End Setup Controls ---

        function resetPointPosition(point, initial = false) {
            const laneWidth = roadWidth / 2 - kerbWidth - pointRadius * 2;
            point.position.x = (Math.random() * 2 - 1) * laneWidth;
            point.position.y = pointRadius + 0.01; // Position relative to point radius
            if (initial) { point.position.z = Math.random() * roadLength - roadLength / 2; }
            else { point.position.z = roadLength / 2 + Math.random() * roadLength * 0.5; }
            point.visible = true;
        }

        function updateScoreDisplay() { scoreElement.textContent = `Score: ${score}`; }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            requestAnimationFrame(animate);
            if (isGameOver) return; // Stop updates if game over

            const deltaZ = driveSpeed;

            // --- Scenery Movement ---
            roadLines.forEach(line => { line.position.z -= deltaZ; if (line.position.z < -roadLength / 2) { line.position.z += roadLength; } });
            buildings.forEach(building => { building.position.z -= deltaZ; if (building.position.z < -roadLength / 2 - building.geometry.parameters.depth / 2) { building.position.z += roadLength + Math.random() * buildingSpacing * 2; const sideSign = Math.sign(building.position.x); const xOffset = roadWidth / 2 + kerbWidth + 1 + Math.random() * 5 + building.geometry.parameters.width / 2; building.position.x = sideSign * xOffset; } });
            streetLights.forEach(light => { light.position.z -= deltaZ; if (light.position.z < -roadLength / 2) { light.position.z += roadLength + Math.random() * lightSpacing * 2; } });
            trafficLights.forEach(light => { light.position.z -= deltaZ; if (light.position.z < -roadLength / 2) { light.position.z += roadLength * 1.5 + Math.random() * roadLength; } });
            kerbs.forEach(kerb => { kerb.position.z -= deltaZ; if (kerb.position.z < -roadLength / 2) { kerb.position.z += roadLength; } }); // Simple wrap for kerbs


             // --- Move and Recycle Points ---
             points.forEach(point => { if (!point.visible) return; point.position.z -= deltaZ; if (point.position.z < -roadLength / 2) { resetPointPosition(point); } });

             // --- Move Enemy Car ---
             if (enemyCar) {
                 enemyCar.position.z -= enemyCarSpeed; // Independent speed
                 if (enemyCar.position.z < -roadLength / 2 - 10) { // Check slightly beyond edge
                    enemyCar.position.z = roadLength / 2 + Math.random() * 50;
                    enemyCar.position.x = (Math.random() < 0.5 ? -1 : 1) * roadWidth / 4 * (0.5 + Math.random());
                 }
             }

             // --- Handle Player Car Controls & Update Bounding Box ---
             if (carModel && carBaseY > 0) { // Check carBaseY to ensure model loaded somewhat
                let maxBounds = roadWidth / 2 - kerbWidth - 0.1; // Initial bounds
                try {
                    // Attempt to get precise width, fallback if geometry fails
                    const box = new THREE.Box3().setFromObject(carModel);
                    const carWidth = box.max.x - box.min.x; // More reliable width calc
                    const carHalfWidth = carWidth / 2;
                    maxBounds = roadWidth / 2 - kerbWidth - carHalfWidth - 0.1; // Update with car width
                } catch(e) {
                    console.warn("Could not get car bounding box size, using default bounds.");
                }


                if (moveLeft && carModel.position.x > -maxBounds) { carModel.position.x -= carMoveSpeed; }
                if (moveRight && carModel.position.x < maxBounds) { carModel.position.x += carMoveSpeed; }
                carModel.position.x = Math.max(-maxBounds, Math.min(maxBounds, carModel.position.x));

                // Update Player Bounding Box
                playerBox.setFromObject(carModel);

                // Update Camera (smooth follow)
                const targetCameraX = carModel.position.x * 0.5; // Camera follows less drastically than car
                camera.position.x += (targetCameraX - camera.position.x) * 0.1;
                camera.lookAt(carModel.position.x, carBaseY + 1, carModel.position.z + 5); // Ensure lookAt uses carBaseY
             }

             // --- Collision Detection ---
             if (carModel) {
                 // Point Collision
                 points.forEach(point => { if (!point.visible) return; pointBox.setFromObject(point); if (playerBox.intersectsBox(pointBox)) { score += pointValue; updateScoreDisplay(); point.visible = false; } });
                 // Enemy Collision
                 if (enemyCar) { enemyBox.setFromObject(enemyCar); if (playerBox.intersectsBox(enemyBox)) { console.log("Collision with enemy!"); isGameOver = true; gameOverElement.style.display = 'block'; } }
             }

            // --- Render ---
            renderer.render(scene, camera);
        }