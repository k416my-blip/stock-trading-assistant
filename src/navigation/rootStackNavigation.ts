import { CommonActions, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/** Navigate to a root-stack screen from nested tab / sheet navigators. */
export function navigateRootStack<Route extends keyof RootStackParamList>(
  navigation: NavigationProp<ParamListBase>,
  route: Route,
  params?: RootStackParamList[Route],
): void {
  let root: NavigationProp<ParamListBase> | undefined = navigation;
  while (root?.getParent()) {
    root = root.getParent() ?? undefined;
  }
  const target = root ?? navigation;
  target.dispatch(
    CommonActions.navigate({
      name: route as string,
      params,
    }),
  );
}
