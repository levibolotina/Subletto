// TypeScript 5.x changed Body.json() to return Promise<unknown>.
// Override to Promise<any> so fetch().json() usages don't require casts throughout the app.
interface Body {
  json(): Promise<any>;
}
