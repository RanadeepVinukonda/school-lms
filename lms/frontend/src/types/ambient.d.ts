// ponytail: stub declarations for missing type packages
declare namespace React {
  type ReactNode = any;
  type ReactElement = any;
  type FC<P = {}> = (props: P) => ReactElement | null;
  type ComponentType<P = {}> = FC<P>;
  type CSSProperties = { [key: string]: string | number };
  type InputHTMLAttributes<T> = { [key: string]: any };
  type ButtonHTMLAttributes<T> = { [key: string]: any };
  type HTMLAttributes<T> = { [key: string]: any; className?: string; children?: ReactNode };
    type FormEvent<T = Element> = { currentTarget: T; target: T; preventDefault(): void; stopPropagation(): void };
    type ChangeEvent<T = Element> = { currentTarget: T; target: T; preventDefault(): void; stopPropagation(): void };
    type MouseEvent<T = Element> = { currentTarget: T; target: T; preventDefault(): void; stopPropagation(): void };
    type Dispatch<A> = (value: A) => void;
    type SetStateAction<S> = S | ((prev: S) => S);
    type RefObject<T> = { current: T | null };
    type MutableRefObject<T> = { current: T };
    type Ref<T> = RefObject<T> | ((instance: T | null) => void) | null;
    type Key = string | number;
  type ReactText = string | number;
  type ReactChild = ReactElement | ReactText;
  type ReactFragment = {} | ReactNode[];
  type PropsWithChildren<P> = P & { children?: ReactNode };
  function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useRef<T>(initial: T): MutableRefObject<T>;
  function createContext<T>(defaultValue: T): any;
  function createElement(type: any, props?: any, ...children: any[]): any;
  function forwardRef<T, P = {}>(render: any): any;
  function memo<T>(component: T): T;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  function useMemo<T>(factory: () => T, deps: any[]): T;
  function useContext<T>(context: any): T;
  type Context<T> = any;
  type Provider<T> = any;
  const Fragment: any;
  const Suspense: any;
  const StrictMode: any;
  const Children: any;
  function createRef<T>(): RefObject<T>;
  function useLayoutEffect(effect: () => void | (() => void), deps?: any[]): void;
    namespace JSX {
    interface ElementChildrenAttribute { children: any }
    interface IntrinsicElements { [elem: string]: any }
    interface ElementAttributesProperty { props: any }
    interface IntrinsicAttributes { key?: Key }
  }
}

declare module 'react' {
  export = React;
  export as namespace React;
}

declare module 'react/jsx-runtime' { export const jsx: any; export const jsxs: any; }
declare module 'react-dom' { export function createRoot(container: any): any; export function hydrateRoot(container: any, element: any): any; }
declare module 'react-dom/client' { export function createRoot(container: any): any; export function hydrateRoot(container: any, element: any): any; }
declare module 'react-router-dom' { const v: any; export default v; export const useNavigate: any; export const useParams: any; export const useLocation: any; export const Link: any; export const NavLink: any; export const Outlet: any; export const Route: any; export const Routes: any; export const BrowserRouter: any; export const useSearchParams: any; export const RouterProvider: any; export const createBrowserRouter: any; export const Navigate: any; export const useRoutes: any; export const MemoryRouter: any; export const HashRouter: any; }
declare module 'framer-motion' { const v: any; export default v; export const motion: any; export const AnimatePresence: any; export const useAnimation: any; export const useMotionValue: any; export const useTransform: any; export const MotionConfig: any; export const useInView: any; }
declare module 'lucide-react' { export const Icon: any; const v: any; export default v; export const Loader2: any; export const Mail: any; export const ArrowLeft: any; export const CheckCircle2: any; export const Search: any; export const Bell: any; export const User: any; export const Menu: any; export const X: any; export const ChevronDown: any; export const ChevronUp: any; export const ChevronLeft: any; export const ChevronRight: any; }
declare module 'sonner' { export const toast: any; export const Toaster: any; }
declare module '@tanstack/react-query' { export const useQuery: any; export const useMutation: any; export const useQueryClient: any; export const QueryClient: any; export const QueryClientProvider: any; }
declare module 'zustand' { export function create<T>(config: any): any; }
declare module 'zustand/middleware' { export const persist: any; export const devtools: any; }
declare module 'zod' {
  interface ZodType<T = any> { _type: T }
  type infer<T extends ZodType> = T['_type'];
  const z: any;
  export default z;
  export { z };
  export type { ZodType, infer };
}
declare module '@hookform/resolvers/zod' { export const zodResolver: any; }
declare module 'react-hook-form' { export const useForm: any; export const useFieldArray: any; export const Controller: any; export const FormProvider: any; export const useFormContext: any; }
declare module 'date-fns' { export function format(date: any, fmt: string): string; export function parseISO(date: string): Date; }
declare module 'react-helmet-async' { export const Helmet: any; export const HelmetProvider: any; }
declare module 'axios' { function create(config?: any): any; export { create }; export default { create }; }
declare module '@supabase/supabase-js' { export function createClient(url: string, key: string): any; }
declare module 'clsx' { function clsx(...args: any[]): string; export default clsx; }
declare module 'tailwind-merge' { export function twMerge(...classes: any[]): string; }
declare module 'pdfjs-dist' { const v: any; export default v; }
declare module 'tesseract.js' { export function recognize(img: any, lang: string, options?: any): Promise<any>; }
declare module 'firebase/app' { export function initializeApp(config: any): any; }
declare module 'firebase/messaging' { export function getMessaging(app: any): any; export function getToken(messaging: any): Promise<string>; export function onMessage(messaging: any, handler: any): any; }
declare module 'class-variance-authority' { export function cva(base: string, config?: any): any; }
declare module '@radix-ui/react-avatar' { const v: any; export default v; }
declare module '@radix-ui/react-checkbox' { const v: any; export default v; }
declare module '@radix-ui/react-dialog' { const v: any; export default v; }
declare module '@radix-ui/react-dropdown-menu' { const v: any; export default v; }
declare module '@radix-ui/react-label' { const v: any; export default v; }
declare module '@radix-ui/react-popover' { const v: any; export default v; }
declare module '@radix-ui/react-progress' { const v: any; export default v; }
declare module '@radix-ui/react-radio-group' { const v: any; export default v; }
declare module '@radix-ui/react-select' { const v: any; export default v; }
declare module '@radix-ui/react-separator' { const v: any; export default v; }
declare module '@radix-ui/react-slot' { export const Slot: any; }
declare module '@radix-ui/react-switch' { const v: any; export default v; }
declare module '@radix-ui/react-tabs' { const v: any; export default v; }
declare module '@radix-ui/react-tooltip' { const v: any; export default v; }
