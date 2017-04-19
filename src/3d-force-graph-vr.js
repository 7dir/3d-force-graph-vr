import './3d-force-graph-vr.css';

import 'aframe';
import 'aframe-line-component';

import * as d3Core from 'd3';
import * as d3Force from 'd3-force-3d';
import { default as extend } from 'lodash/assign';
let d3 = {};
extend(d3, d3Core, d3Force);

export default function() {

	const CAMERA_DISTANCE2NODES_FACTOR = 150;

	class CompProp {
		constructor(name, initVal = null, redigest = true, onChange = newVal => {}) {
			this.name = name;
			this.initVal = initVal;
			this.redigest = redigest;
			this.onChange = onChange;
		}
	}

	const env = { // Holds component state
		initialised: false
	};

	const exposeProps = [
		new CompProp('width', window.innerWidth),
		new CompProp('height', window.innerHeight),
		new CompProp('graphData', {
			nodes: { 1: { name: 'mock', val: 1 } },
			links: [[1, 1]] // [from, to]
		}),
		new CompProp('numDimensions', 3),
		new CompProp('nodeRelSize', 4), // volume per val unit
		new CompProp('lineOpacity', 0.2),
		new CompProp('valAccessor', node => node.val),
		new CompProp('nameAccessor', node => node.name),
		new CompProp('colorAccessor', node => node.color),
		new CompProp('warmUpTicks', 0), // how many times to tick the force engine at init before starting to render
		new CompProp('coolDownTicks', Infinity),
		new CompProp('coolDownTime', 15000) // ms
	];

	function initStatic() {
		// Wipe DOM
		env.domNode.innerHTML = '';

		// Add scene
		env.scene = d3.select(env.domNode).append('a-scene');

		env.scene.append('a-sky').attr('color', '#002');

		// Add force-directed layout
		env.forceLayout = d3.forceSimulation()
			.force('link', d3.forceLink().id(d => d._id))
			.force('charge', d3.forceManyBody())
			.force('center', d3.forceCenter())
			.stop();

		/*
		// Add nav info section
		const navInfo = document.createElement('div');
		navInfo.classList.add('graph-nav-info');
		navInfo.innerHTML = "MOVE mouse &amp; press LEFT/A: rotate, MIDDLE/S: zoom, RIGHT/D: pan";
		env.domNode.appendChild(navInfo);
		*/

		/*
		// Setup tooltip
		env.toolTipElem = document.createElement('div');
		env.toolTipElem.classList.add('graph-tooltip');
		env.domNode.appendChild(env.toolTipElem);
		*/

		/*
		// Capture mouse coords on move
		env.raycaster = new THREE.Raycaster();
		env.mouse = new THREE.Vector2();
		env.mouse.x = -2; // Initialize off canvas
		env.mouse.y = -2;
		env.domNode.addEventListener("mousemove", ev => {
			// update the mouse pos
			const offset = getOffset(env.domNode),
				relPos = {
					x: ev.pageX - offset.left,
					y: ev.pageY - offset.top
				};
			env.mouse.x = (relPos.x / env.width) * 2 - 1;
			env.mouse.y = -(relPos.y / env.height) * 2 + 1;

			// Move tooltip
			env.toolTipElem.style.top = (relPos.y - 40) + 'px';
			env.toolTipElem.style.left = (relPos.x - 20) + 'px';

			function getOffset(el) {
				const rect = el.getBoundingClientRect(),
					scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
					scrollTop = window.pageYOffset || document.documentElement.scrollTop;
				return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
			}
		}, false);
		*/

		/*
		// Setup camera
		env.camera = new THREE.PerspectiveCamera();
		env.camera.far = 20000;
		env.camera.position.z = 1000;

		// Setup scene
		env.scene = new THREE.Scene();

		// Setup renderer
		env.renderer = new THREE.WebGLRenderer();
		env.domNode.appendChild(env.renderer.domElement);

		// Add camera interaction
		env.controls = new THREE.TrackballControls(env.camera, env.renderer.domElement);
		*/

		env.initialised = true;

		//

		/*
		// Kick-off renderer
		(function animate() { // IIFE
			// Update tooltip
			env.raycaster.setFromCamera(env.mouse, env.camera);
			const intersects = env.raycaster.intersectObjects(env.scene.children);
			env.toolTipElem.innerHTML = intersects.length ? intersects[0].object.name || '' : '';

			// Frame cycle
			env.controls.update();
			env.renderer.render(env.scene, env.camera);
			requestAnimationFrame(animate);
		})()
		*/
	}

	function digest() {
		if (!env.initialised) { return }

		resizeCanvas();

		// Build graph with data
		const d3Nodes = [];
		for (let nodeId in env.graphData.nodes) { // Turn nodes into array
			const node = env.graphData.nodes[nodeId];
			node._id = nodeId;
			d3Nodes.push(node);
		}
		const d3Links = env.graphData.links.map(link => {
			return { _id: link.join('>'), source: link[0], target: link[1] };
		});
		if (!d3Nodes.length) { return; }

		// Add A-frame objects
		let nodes = env.scene.selectAll('a-sphere.node')
			.data(d3Nodes, d => d._id);

		nodes.exit().remove();

		nodes = nodes.merge(
			nodes.enter()
				.append('a-sphere')
					.classed('node', true)
					.attr('radius', d => Math.cbrt(env.valAccessor(d) || 1) * env.nodeRelSize)
					.attr('color', d => '#' + (env.colorAccessor(d) || 0xffffaa).toString(16))
		);

		let links = env.scene.selectAll('a-entity.link')
			.data(d3Links, d => d._id);

		links.exit().remove();

		links = links.merge(
			links.enter()
				.append('a-entity')
					.classed('link', true)
		);

		/*
		// Add WebGL objects
		d3Nodes.forEach(node => {
			const nodeMaterial = new THREE.MeshBasicMaterial({ color: env.colorAccessor(node) || 0xffffaa, transparent: true });
			nodeMaterial.opacity = 0.75;

			const sphere = new THREE.Mesh(
				new THREE.SphereGeometry(Math.cbrt(env.valAccessor(node) || 1) * env.nodeRelSize, 8, 8),
				nodeMaterial
			);
			sphere.name = env.nameAccessor(node) || '';

			env.scene.add(node._sphere = sphere)
		});
		*/

		/*
		const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xf0f0f0, transparent: true });
		lineMaterial.opacity = env.lineOpacity;
		d3Links.forEach(link => {
			const line = new THREE.Line(new THREE.Geometry(), lineMaterial);
			line.geometry.vertices=[new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)];

			const fromName = getNodeName(link.source),
				toName = getNodeName(link.target);
			if (fromName && toName) { line.name = `${fromName} > ${toName}`; }

			env.scene.add(link._line = line);

			function getNodeName(nodeId) {
				return env.nameAccessor(env.graphData.nodes[nodeId]);
			}
		});
		*/

		/*
		env.camera.lookAt(env.scene.position);
		env.camera.position.z = Math.cbrt(d3Nodes.length) * CAMERA_DISTANCE2NODES_FACTOR;
		*/

		/*
		// Add force-directed layout
		const layout = d3.forceSimulation()
			.numDimensions(env.numDimensions)
			.nodes(d3Nodes)
			.force('link', d3.forceLink().id(d => d._id).links(d3Links))
			.force('charge', d3.forceManyBody())
			.force('center', d3.forceCenter())
			.stop();
		*/

		env.forceLayout
			.stop()
			.numDimensions(env.numDimensions)
			.nodes(d3Nodes)
			.force('link').links(d3Links);

		for (let i=0; i<env.warmUpTicks; i++) { env.forceLayout.tick(); } // Initial ticks before starting to render

		let cntTicks = 0;
		const startTickTime = new Date();
		env.forceLayout.on("tick", layoutTick).restart();

		//

		function resizeCanvas() {
			if (env.width && env.height) {
				//env.renderer.setSize(env.width, env.height);
				//env.camera.aspect = env.width/env.height;
				//env.camera.updateProjectionMatrix();
			}
		}

		function layoutTick() {

			if (cntTicks++ > env.coolDownTicks || (new Date()) - startTickTime > env.coolDownTime) {
				env.forceLayout.stop(); // Stop ticking graph
			}

			// Update nodes position
			nodes.attr('position', d => `${d.x} ${d.y || 0} ${d.z || 0}`);

			//Update links position
			links.attr('line', d => `start: ${d.source.x} ${d.source.y || 0} ${d.source.z || 0};  end: ${d.target.x} ${d.target.y || 0} ${d.target.z || 0}; color: #f0f0f0`);

			/*
			// Update nodes position
			d3Nodes.forEach(node => {
				const sphere = node._sphere;
				sphere.position.x = node.x;
				sphere.position.y = node.y || 0;
				sphere.position.z = node.z || 0;
			});
			*/

			/*
			// Update links position
			d3Links.forEach(link => {
				const line = link._line;

				line.geometry.vertices = [
					new THREE.Vector3(link.source.x, link.source.y || 0, link.source.z || 0),
					new THREE.Vector3(link.target.x, link.target.y || 0, link.target.z || 0)
				];

				line.geometry.verticesNeedUpdate = true;
				line.geometry.computeBoundingSphere();
			});
			*/
		}
	}

	// Component constructor
	function chart(nodeElement) {
		env.domNode = nodeElement;

		initStatic();
		digest();

		return chart;
	}

	// Getter/setter methods
	exposeProps.forEach(prop => {
		chart[prop.name] = getSetEnv(prop.name, prop.redigest, prop.onChange);
		env[prop.name] = prop.initVal;
		prop.onChange(prop.initVal);

		function getSetEnv(prop, redigest = false,  onChange = newVal => {}) {
			return _ => {
				if (!arguments.length) { return env[prop] }
				env[prop] = _;
				onChange(_);
				if (redigest) { digest() }
				return chart;
			}
		}
	});

	// Reset to default state
	chart.resetState = function() {
		this.graphData({nodes: [], links: []})
			.nodeRelSize(4)
			.lineOpacity(0.2)
			.valAccessor(node => node.val)
			.nameAccessor(node => node.name)
			.colorAccessor(node => node.color)
			.warmUpTicks(0)
			.coolDownTicks(Infinity)
			.coolDownTime(15000); // ms

		return this;
	};

	chart.resetState(); // Set defaults at instantiation

	return chart;
};
