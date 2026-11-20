using System;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// The standalone page script, for a page that loads neither the bundle nor its CSS, such as one that mirrors the web client. It sets
/// the global <c>BasePage</c> with the bundle's web push and casing helpers, built from the same sources, and holds no text of its own.
/// </summary>
/// <remarks>
/// scripts/build-page-script.mjs writes this file from <c>src/js/lib/page-script.ts</c>, and a test fails when it is out of date.
/// </remarks>
public static class BasePageScript
{
    /// <summary>
    /// The script. It defines <c>BasePage.webPushState</c>, <c>subscribeWebPush</c>, and <c>unsubscribeWebPush</c>, which resolve to a
    /// state code, <c>webPushLabel</c>, and <c>titleCase</c> and <c>sentenceCase</c>, which take the plugin's casing list.
    /// </summary>
    public const string Script = """
        "use strict";(()=>{function O(e){var r=C();return r?Promise.resolve(r):Notification.permission==="denied"?Promise.resolve("denied"):e?Promise.resolve(e).then(function(n){return n.pushManager.getSubscription()}).then(function(n){return n&&Notification.permission==="granted"?"on":"off"}):Promise.resolve("off")}function T(e){var r=C();if(r)return Promise.resolve(r);var n=H(e.publicKey||"");return n.length?Promise.resolve(Notification.requestPermission()).then(function(t){return t!=="granted"?t==="denied"?"denied":"off":Promise.resolve(e.registration).then(function(o){return o.pushManager.getSubscription().then(function(u){return u&&!G(u,n)?u.unsubscribe().then(function(){return null}):u}).then(function(u){return u||o.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:n})})}).then(function(o){var u=e.save?e.save(R(o)):null;return Promise.resolve(u).then(function(){return"on"})})}):Promise.reject(new Error("publicKey is required"))}function N(e){var r=C();return r?Promise.resolve(r):Promise.resolve(e.registration).then(function(n){return n.pushManager.getSubscription()}).then(function(n){if(!n)return"off";var t=e.remove?e.remove(R(n)):null;return Promise.resolve(t).then(function(){return n.unsubscribe()}).then(function(){return"off"})})}function A(e){var r=e==null?typeof navigator!="undefined"?navigator.userAgent:"":e,n=/Edg\//.test(r)?"Edge":/OPR\//.test(r)?"Opera":/Firefox\//.test(r)?"Firefox":/Chrome\//.test(r)||/CriOS\//.test(r)?"Chrome":/Safari\//.test(r)?"Safari":"",t=/iPhone/.test(r)?"iPhone":/iPad/.test(r)?"iPad":/Android/.test(r)?"Android":/Mac OS X|Macintosh/.test(r)?"macOS":/Windows/.test(r)?"Windows":/CrOS/.test(r)?"ChromeOS":/Linux/.test(r)?"Linux":"";return n&&t?n+" \xB7 "+t:n||t}function C(){if(typeof window=="undefined")return"unsupported";if(window.isSecureContext===!1)return"insecure";var e=typeof navigator!="undefined"?navigator:null;return J(e)&&!F(e)?"install":!e||!("serviceWorker"in e)||typeof window.PushManager=="undefined"||typeof window.Notification=="undefined"?"unsupported":null}function J(e){return e?/iPhone|iPad|iPod/.test(e.userAgent||"")||/Macintosh/.test(e.userAgent||"")&&(e.maxTouchPoints||0)>1:!1}function F(e){return e&&e.standalone===!0?!0:typeof window.matchMedia=="function"&&window.matchMedia("(display-mode: standalone)").matches}function R(e){var r=e.toJSON(),n=r.keys||{};return{endpoint:r.endpoint||e.endpoint,keys:{p256dh:n.p256dh||"",auth:n.auth||""},label:A()}}function G(e,r){var n=e.options&&e.options.applicationServerKey;if(!n)return!0;var t=new Uint8Array(n);if(t.length!==r.length)return!1;for(var o=0;o<t.length;o++)if(t[o]!==r[o])return!1;return!0}function H(e){var r=String(e||"").trim().replace(/=+$/,"");if(!/^[A-Za-z0-9_-]*$/.test(r))return new Uint8Array(0);for(var n=r.replace(/-/g,"+").replace(/_/g,"/");n.length%4;)n+="=";try{for(var t=atob(n),o=new Uint8Array(t.length),u=0;u<t.length;u++)o[u]=t.charCodeAt(u);return o}catch(i){return new Uint8Array(0)}}var L=["Jellyfin","TV","ID","API","URL","HTTP","HTTPS","IP","DNS","HDR","SDR","4K"],D={};["a","an","and","as","at","but","by","for","from","in","into","nor","of","on","or","per","the","to","via","vs","with"].forEach(function(e){D[e]=!0});var j=/[\p{L}\p{Nd}]/u,V=/\p{L}/u,$=/\p{Nd}/u,z=/\p{Lu}/u,K=/\s/;function X(e){var r=String(e||"").trim().replace(/_/g,"-").toLowerCase();return r===""||r==="en"||r.indexOf("en-")===0}function w(...e){var r=[];return e.forEach(function(n){(n||[]).forEach(function(t){if(!(typeof t!="string"||!t.trim())){var o=t.trim(),u=o.toLowerCase(),i=-1;r.forEach(function(p,l){p.toLowerCase()===u&&(i=l)}),i>=0?r[i]=o:r.push(o)}})}),r.map(function(n,t){return{w:n,i:t}}).sort(function(n,t){return t.w.length-n.w.length||n.i-t.i}).map(function(n){return n.w})}function S(e){return e!==void 0&&j.test(e)}function U(e){if(!e)return e;var r=e.charAt(0).toUpperCase();return(r.length===1?r:e.charAt(0))+e.slice(1)}function M(e,r,n){for(var t=r;t<r+n;t++)e[t]=!0}function I(e,r,n){for(var t=r;t<r+n;t++)if(e[t])return!0;return!1}function k(e,r,n){for(var t=r-1;t>=0&&K.test(e[t]);)t--;return t<0||n&&t===r-1?"":e[t]}function E(e,r,n,t,o){var u=String(e==null?"":e);if(!u||!X(n))return u;for(var i=u.split(""),p=i.map(function(){return!1}),l=0;l<i.length;l++)if(i[l]==="{"){for(var h=l+1;h<i.length&&i[h]!=="}"&&i[h]!=="{"&&!K.test(i[h]);)h++;h<i.length&&i[h]==="}"&&(M(p,l,h-l+1),l=h)}var _=u.toLowerCase();w(r).forEach(function(f){for(var P=f.toLowerCase(),s=0;s<=u.length-f.length;){var a=_.indexOf(P,s);if(a<0)return;var g=a+f.length,d=!S(i[a-1])&&!S(i[g]);if(d&&!I(p,a,f.length)){for(var c=0;c<f.length;c++)i[a+c]=f.charAt(c);M(p,a,f.length),s=g}else s=a+1}});for(var y=[],b=0;b<i.length;){if(!S(i[b])){b++;continue}for(var v=b;v<i.length&&(S(i[v])||(i[v]==="'"||i[v]==="\u2019")&&S(i[v+1]));)v++;y.push([b,v]),b=v}return y.forEach(function(f,P){var s=f[0],a=f[1];if(!I(p,s,a-s)){var g=i.slice(s,a).join("");if(!(z.test(g.slice(1))||$.test(g)&&V.test(g))){var d=g.toLowerCase(),c;if(t){var x=i[s-1]==="-"||i[a]==="-",B=P===0||P===y.length-1||x||k(i,s,!1)===":";c=!B&&D[d]?d:U(g)}else{var W=k(i,s,!0);c=P===0&&o!==!1||W==="."||W==="!"||W==="?"?U(d):d}for(var m=0;m<c.length&&m<a-s;m++)i[s+m]=c.charAt(m)}}}),i.join("")}window.BasePage={webPushState:O,subscribeWebPush:T,unsubscribeWebPush:N,webPushLabel:A,titleCase:function(e,r,n){return E(e,w(L,r),n,!0)},sentenceCase:function(e,r,n){return E(e,w(L,r),n,!1)}};})();
        """;

    /// <summary>
    /// Answers a request for the script, as JavaScript that a browser checks again on every load.
    /// </summary>
    /// <param name="response">The response, which receives the cache header.</param>
    /// <returns>The script.</returns>
    public static ContentResult Serve(HttpResponse response)
    {
        ArgumentNullException.ThrowIfNull(response);
        response.Headers.CacheControl = "no-cache";
        return new ContentResult { Content = Script, ContentType = "text/javascript; charset=utf-8", StatusCode = StatusCodes.Status200OK };
    }
}
