/* Una sola evaluación para reproducción, cursor temporal y edición. */
window.SceneAnimation = {
    evaluate(keys, frame) {
        if (frame <= keys[0].frame) return {...keys[0]};
        const last = keys[keys.length - 1];
        if (frame >= last.frame) return {...last};
        const index = keys.findIndex(key => key.frame > frame);
        const a = keys[index - 1], b = keys[index];
        let t = (frame - a.frame) / (b.frame - a.frame);
        if (a.interpolacion === "suave") t = t * t * (3 - 2 * t);
        const pose = {frame, interpolacion: a.interpolacion};
        for (const property of ["x", "y", "giro", "opacidad"]) pose[property] = a[property] + (b[property] - a[property]) * t;
        return pose;
    }
};
