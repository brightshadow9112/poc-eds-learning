export default function decorate(block) {
  const audioFallbackText = block.children[0].textContent.trim();
  const audioElement = document.createElement('audio');
  audioElement.controls = true;
  [...block.children].forEach((source, index) => {
    if (index > 0) {
      const sourceURL = source.textContent.trim();
      if (sourceURL.length) {
        const sourceExtension = sourceURL.split('.').pop().split(/#|\?/)[0];
        const sourceElement = document.createElement('source');
        sourceElement.src = sourceURL;
        sourceElement.type = `audio/${sourceExtension}`;
        audioElement.appendChild(sourceElement);
      }
    }
  });
  audioElement.appendChild(document.createTextNode(audioFallbackText));
  block.append(audioElement);
}
