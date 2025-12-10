    const connectingLoaderDiv = document.createElement('div');
    connectingLoaderDiv.id = 'connectingLoader';
    connectingLoaderDiv.style.position = 'fixed';
    connectingLoaderDiv.style.top = '0';
    connectingLoaderDiv.style.left = '0';
    connectingLoaderDiv.style.width = '100%';
    connectingLoaderDiv.style.height = '100%';
    connectingLoaderDiv.style.backgroundColor = '#fff';
    connectingLoaderDiv.style.display = 'flex';
    connectingLoaderDiv.style.alignItems = 'center';
    connectingLoaderDiv.style.justifyContent = 'center';
    connectingLoaderDiv.style.fontSize = '24px';
    connectingLoaderDiv.style.fontWeight = 'bold';
    connectingLoaderDiv.style.zIndex = '9999';
    connectingLoaderDiv.innerText = 'Connecting';
    document.body.appendChild(connectingLoaderDiv);

    let dotCount = 0;
    const maxDots = 3;
    let loaderMode = "connecting";
    let dotInterval = setInterval(() => {
      dotCount = (dotCount + 1) % (maxDots + 1);
      if (loaderMode === "connecting") {
        connectingLoaderDiv.innerText = 'Connecting' + '.'.repeat(dotCount);
      } else {
        connectingLoaderDiv.innerText = 'Loading Page' + '.'.repeat(dotCount);
      }
    }, 500);

    // -------------------------
    // Your page variables
    // -------------------------
    const expiryId = "TRL"; // you used this earlier
    let pageLoaded = false;

    // -------------------------
    // Helper: check expiration
    // -------------------------
    function isExpired(current, expiry) {
      try {
        return new Date(current).getTime() > new Date(expiry).getTime();
      } catch (e) {
        console.error("Date compare error:", e);
        return true;
      }
    }

    // -------------------------
    // Main loader (calls Netlify function)
    // -------------------------
    async function loadBase64HTML(retries = 3) {
      if (pageLoaded) return;

      try {
        loaderMode = "loading";

        // IMPORTANT: This fetch only calls your Netlify function.
        // The browser network tab will show only "/.netlify/functions/data"
        const res = await fetch("/.netlify/functions/data", { cache: "no-store" });

        if (!res.ok) throw new Error("Failed to fetch data from server function: " + res.status);

        const json = await res.json();

        const currentDatetime = json.datetime;
        const sheet = json.sheet;

        if (!currentDatetime || !sheet?.data) {
          throw new Error("Invalid data returned from server function");
        }

        const item = sheet.data.find(entry => entry.id === expiryId);
        if (!item || !item.html || !item.init || !item.date) {
          throw new Error("Required item not found or missing fields");
        }

        // Check expiry
        if (isExpired(currentDatetime, item.date)) {
          clearInterval(dotInterval);
          alert("This page has expired.");
          document.body.innerHTML = "This Page is no longer available";
          return;
        }

        pageLoaded = true;

        // Stop loader
        clearInterval(dotInterval);
        const loader = document.getElementById('connectingLoader');
        if (loader) {
          loader.style.opacity = '0';
          // remove after fade
          setTimeout(() => loader.remove(), 250);
        }

        // Write the decoded HTML into the page
        const decodedHTML = atob(item.html);
        document.open();
        document.write(decodedHTML);
        document.close();

        // Initialize the page by evaluating the base64 init code
        const initFnCode = atob(item.init);
        // Using eval as original setup — ensure init code is trusted
        try {
          eval(initFnCode);
        } catch (e) {
          console.error("Error evaluating initialize function:", e);
        }

        // If initializePage exists, call it
        if (typeof initializePage === 'function') {
          try { initializePage(); } catch (e) { console.error(e); }
        }

      } catch (error) {
        console.warn("loadBase64HTML error:", error);
        if (!pageLoaded && retries > 0) {
          // retry after 2s
          setTimeout(() => loadBase64HTML(retries - 1), 2000);
        } else if (!pageLoaded) {
          clearInterval(dotInterval);
          document.body.innerHTML = "<h2>Failed to load page. Please try again later.</h2>";
        }
      }
    }

    // Start loading
    loadBase64HTML();
