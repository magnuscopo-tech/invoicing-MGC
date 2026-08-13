const waitForFrameReady = async (frame) => {
  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument;

  if (!frameWindow || !frameDocument) return;

  if (frameDocument.fonts?.ready) {
    await frameDocument.fonts.ready;
  }

  const images = Array.from(frameDocument.images || []);
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      });
    })
  );
};

export const printHtmlAsPdf = async (html, fileName = "document.pdf") => {
  if (!html) return false;

  const frame = document.createElement("iframe");
  const previousTitle = document.title;
  const cleanFileName = fileName.replace(/\.pdf$/i, "");

  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";
  frame.setAttribute("aria-hidden", "true");

  document.body.appendChild(frame);

  try {
    await new Promise((resolve) => {
      frame.onload = resolve;
      frame.srcdoc = html;
    });

    await waitForFrameReady(frame);

    document.title = cleanFileName;
    const cleanup = () => {
      document.title = previousTitle;
      frame.remove();
    };

    frame.contentWindow?.addEventListener("afterprint", cleanup, {
      once: true,
    });
    window.setTimeout(cleanup, 60000);

    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    return true;
  } catch (error) {
    document.title = previousTitle;
    frame.remove();
    throw error;
  }
};
