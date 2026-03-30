import mermaid from 'mermaid';

let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      // Inku color palette
      primaryColor: '#7c6af7',
      primaryTextColor: '#e8e8e8',
      primaryBorderColor: '#5a52b8',
      lineColor: '#8b8b9e',
      secondaryColor: '#2a2a3d',
      tertiaryColor: '#1a1a2e',
      background: '#111118',
      mainBkg: '#1c1c28',
      nodeBorder: '#5a52b8',
      clusterBkg: '#1a1a2e',
      titleColor: '#e8e8e8',
      edgeLabelBackground: '#1c1c28',
      attributeBackgroundColorEven: '#1c1c28',
      attributeBackgroundColorOdd: '#111118',
    },
  });
}

export async function renderMermaid(code: string, container: HTMLElement): Promise<void> {
  ensureInitialized();

  const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const { svg } = await mermaid.render(id, code);

  container.innerHTML = svg;
}
