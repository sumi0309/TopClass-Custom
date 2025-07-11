//Click Tracker Script
const clientContextElement = jQuery("#__ClientContext");
const clientContextValue = clientContextElement.length
  ? clientContextElement.val()
  : null;
const serverUrl = "https://jc-prod-ctrack-xy45-linux-as.azurewebsites.net";
let userId = null;
let isGuest = true;

if (clientContextValue) {
  userId = JSON.parse(clientContextValue).loggedInPartyId;
}

if (userId) {
  fetch("https://" + window.location.host + "/api/user/" + userId, {
    headers: {
      RequestVerificationToken: jQuery("#__RequestVerificationToken").val(),
    },
  })
    .then((response) => response.json())
    .then((data) => {
      isGuest = data.UserName === "GUEST";
      console.log("isLoggedin? " + !isGuest);
    })
    .catch((error) => console.error("Error:", error));
}

function createCookie(name, value, seconds) {
  var expires = "";
  if (seconds) {
    var date = new Date();
    date.setTime(date.getTime() + seconds * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + value + expires + "; path=/";
  return value;
}

function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function createSessionKey() {
  const generateGUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  let sessionKey = localStorage.getItem("userSessionKey");
  if (!sessionKey) {
    sessionKey = generateGUID();
    localStorage.setItem("userSessionKey", sessionKey);
  }
  return sessionKey;
}

let userSessionKey = readCookie("AdClicks");
if (!userSessionKey)
  userSessionKey = createCookie("AdClicks", createSessionKey(), 24 * 60 * 60);

jQuery(document).ready(function () {
  // Apply AdClicks to body tag as the first action
  jQuery("html").addClass("AdClicks");
  jQuery("html").addClass("23324");

  async function getAddress(askLoc) {
    let latitude = null;
    let longitude = null;
    let address = null;

    if (askLoc && navigator.geolocation) {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
      console.log(
        "The current user location is: Lat: " +
          latitude +
          " | Long: " +
          longitude
      );
    }

    return {
      Latitude: latitude,
      Longitude: longitude,
    };
  }

  async function bindHandlerToHref() {
    var el = jQuery(this); // Current element with class "AdClicks"
    const className = el.attr("class");
    const links = el.find("a"); // Find all <a> tags inside this element

    links.each(function () {
      const linkElement = jQuery(this);
      const parentElement = linkElement.parent();
      const href = linkElement.attr("href");

      // Skip links that are just hashtags or empty
      if (!href || href === "#" || href === "") {
        return;
      }

      if (linkElement.hasClass("carousel-control")) {
        return;
      }

      if (parentElement.find("a").length > 1) {
        // If the parent contains multiple <a> tags, attach the listener to each <a> individually
        if (!linkElement.data("clickHandlerBound")) {
          linkElement.on("click", async function (event) {
            const inlineId = className.match(/\b\d+\b/)
              ? className.match(/\b\d+\b/)[0]
              : null;

            await hrefClickHandler(
              event,
              className.includes("AdAsk"),
              linkElement,
              inlineId
            );
          });

          linkElement.data("clickHandlerBound", true);
        }
      } else {
        // If the parent contains only one <a>, attach the listener to the parent
        if (!parentElement.data("clickHandlerBound")) {
          parentElement.on("click", async function (event) {
            const inlineId = className.match(/\b\d+\b/)
              ? className.match(/\b\d+\b/)[0]
              : null;

            await hrefClickHandler(
              event,
              className.includes("AdAsk"),
              linkElement,
              inlineId
            );
          });

          parentElement.data("clickHandlerBound", true);
        }
      }
    });
  }

  async function hrefClickHandler(
    event,
    toAskLocation,
    linkElement,
    inlineId = null
  ) {
    event.preventDefault();
    var el = jQuery(linkElement);
    const ad_url = el.attr("href");

    // Determine if link should open in a new tab based on original attributes
    const opensInNewTab =
      el.attr("target") === "_blank" ||
      ad_url.startsWith("tel:") ||
      ad_url.startsWith("mailto:") ||
      ad_url.startsWith("sms:") ||
      el.closest(".AdNew").length > 0;

    if (opensInNewTab) {
      window.open(ad_url, "_blank");
    }

    // Try to get the ad_id from the inlineId first, or from parent classes
    let ad_id = inlineId;

    // If no inlineId was provided, look for numeric id in parent classes
    if (!ad_id) {
      // Look for any parent element with a class containing a numeric ID
      const parentWithNumericClass = el.closest(
        '[class*="0"],[class*="1"],[class*="2"],[class*="3"],[class*="4"],[class*="5"],[class*="6"],[class*="7"],[class*="8"],[class*="9"]'
      );

      if (parentWithNumericClass.length) {
        const className = parentWithNumericClass.attr("class");
        const match = className.match(/\b\d+\b/);
        if (match) ad_id = match[0];
      }
    }

    // Check if any parent has the AdAsk class
    if (!toAskLocation) {
      toAskLocation = el.closest(".AdAsk").length > 0;
    }

    let locationData = { Latitude: null, Longitude: null };
    try {
      locationData = await getAddress(toAskLocation);
    } catch (error) {
      console.error("Error getting location data:", error);
    }

    var userData = {
      AD_URL: ad_url,
      AD_ClassName: ad_id,
      UserAgent: navigator.userAgent,
      UserSessionKey: userSessionKey,
      BrowserVersion: navigator.appVersion,
      CookiesEnabled: navigator.cookieEnabled,
      PreferredLanguage: navigator.language,
      UserPlatform: navigator.platform,
      TimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      DateTime: new Date().toLocaleString("en-US", {
        timeZone: "America/New_York",
      }),
      Latitude: locationData.Latitude,
      Longitude: locationData.Longitude,
      ID: isGuest ? null : userId,
      IsSessionKeyFirstClaimed: !isGuest,
      IsLoggedIn: !isGuest,
      PageUrl: window.location.href,
    };
    console.log(userData);

    // Send tracking data and then navigate accordingly
    try {
      await fetch(`${serverUrl}/api/iMIS/InsertData`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      window.location.href = ad_url;
    } catch (error) {
      console.error("Error sending tracking data:", error);
      window.location.href = ad_url;
    }
  }

  if (
    typeof Sys !== "undefined" &&
    Sys.WebForms &&
    Sys.WebForms.PageRequestManager
  ) {
    Sys.WebForms.PageRequestManager.getInstance().add_endRequest(function () {
      jQuery(".AdClicks").each(bindHandlerToHref);
    });
  }
  jQuery(".AdClicks").each(bindHandlerToHref);
});


window.onload = function () {
       if (
        window.innerWidth >= 769 &&
        window.TCIsAdmin?.() === 4 &&
        window.TCUserRoles === 15
    ) {
        console.log("Admin functions menu enabled");
        const navbar = document.querySelector("#sidr-id-tc-nav-menu-list");
        console.log("Got navbar:", navbar);
        if (!navbar) return;

        const adminItems = Array.from(navbar.children).filter(
            (li) => li.childElementCount > 1
        );

        console.log("Admin items found:", adminItems);
        if (!adminItems.length) return;
        // Remove admin items from navbar before re-adding to admin menu
        adminItems.forEach((item) => {
            if (item.parentNode === navbar) {
                navbar.removeChild(item);
            }
        });
        console.log("Filtered admin items:", adminItems);
        console.log("Creating admin functions menu");

        const adminLi = document.createElement("li");
        adminLi.className = "admin-functions-menu";
        adminLi.style.position = "relative";
        adminLi.innerHTML = `
                <a id="admin-functions-link" tabindex="4" href="javascript:void(0)">Admin Functions</a>
                <ul class="sidr-class-dropdown-menu sidr-class-pull-left" style="display:none"></ul>
        `;
        const adminUl = adminLi.querySelector("ul");
        console.log("Admin submenu created:", adminUl);

        adminItems.forEach((item) => {
            const submenu = item.querySelector("ul");
            if (submenu) {
                submenu.classList.add("admin-submenu");
                item.classList.add("has-submenu");
                item.style.position = "relative";

                item.onmouseenter = () => {
                    submenu.style.display = "block";
                    // Defensive: check submenu exists before using getBoundingClientRect
                    if (submenu) {
                        const { right } = submenu.getBoundingClientRect();
                        submenu.style.left = right > window.innerWidth ? "auto" : "100%";
                        submenu.style.right = right > window.innerWidth ? "100%" : "auto";
                    }
                };
                item.onmouseleave = () => {
                    submenu.style.display = "none";
                    submenu.style.left = "100%";
                    submenu.style.right = "auto";
                };
            }
            adminUl.appendChild(item);
        });
        console.log("Admin submenu populated:", adminUl);

        adminLi.onmouseenter = () => {
            adminUl.style.display = "block";
            const { right } = adminUl.getBoundingClientRect();
            adminUl.style.left = right > window.innerWidth ? "auto" : "0";
            adminUl.style.right = right > window.innerWidth ? "0" : "auto";
        };
        adminLi.onmouseleave = () => {
            adminUl.style.display = "none";
            adminUl.style.left = "0";
            adminUl.style.right = "auto";
        };
        console.log("Admin functions menu ready");
        navbar.insertBefore(adminLi, navbar.lastElementChild || null);
        console.log("Admin functions menu added to navbar");
    }
}

jQuery(document).ready(function () {
        //footer
    const footerHTML = `
        <footer class="footer-custom">
            <div class="footer-main">

            <div class="footer-logo">
                    <a href="/" class="footer-logo-link">
                        <img class="footer-logo-img" src="https://public.openwatercdn.com/778725b5-7954-45f8-bc5d-2cedcea7d6ab/7825847b-889f-4894-a73a-8dea0e60680a.png" alt="Banner Logo">
                    </a>
                    </div>

                <div class="footer-logo-nav">
                    <ul class="footer-nav">
                        <li><a href="#">About Us</a></li>
                        <li><a href="#">Membership</a></li>
                        <li><a href="#">Events</a></li>
                    </ul>
                    <ul class="footer-nav">
                        <li><a href="#">News</a></li> 
                        <li><a href="#">Store</a></li>
                    </ul>
                </div>

                <div class="footer-account-social">
                    <div class="footer-account">
                        <div class="footer-account-links">
                            <a href="https://johnconsulting.topclasslms.com/topclass/topclass.do?logout" class="footer-account-link" style="margin-bottom: 0px;">
                                <span class="footer-account-icon logout-icon"></span>
                                LOGOUT
                            </a>
                        </div>
                        <div class="footer-account-links">
                            <a href="https://johnconsulting.topclasslms.com/topclass/topclass.do?expand-userprofileandsettingsmain#account" class="footer-account-link">
                                <span class="footer-account-icon account-icon"></span>
                                MY ACCOUNT
                            </a>
                        </div>
                    </div>
                    <div class="footer-social">
                        <span class="footer-social-label" style="font-size:14px">CONNECT WITH US</span>
                        <a href="https://www.linkedin.com/company/agribusiness-association-of-australia/" class="SocialSprite LinkedInIcon LargeButtons" title="Visit our LinkedIn page" target="_blank"></a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <span>© 2025 Agro Business International</span>
                <a href="#" class="footer-bottom-link">Terms &amp; Conditions</a>
                <a href="#" class="footer-bottom-link">Privacy Policy</a>
                <a href="#" class="footer-bottom-link">Contact Us</a>
            </div>
        </footer>
        `;

    document.body.insertAdjacentHTML("beforeend", footerHTML);
});
