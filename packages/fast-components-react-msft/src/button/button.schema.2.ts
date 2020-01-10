import { childrenSchema, ChildrenType } from "@microsoft/fast-tooling";

/**
 * Complies with FAST Tooling 2.0
 */
export default {
    $schema: "http://json-schema.org/schema#",
    title: "Button",
    description: "A button component's schema definition.",
    type: "object",
    id: "@microsoft/fast-components-react-msft/button",
    formPluginId: "@microsoft/fast-components-react-msft/button",
    properties: {
        disabled: {
            title: "Disabled",
            type: "boolean",
        },
        href: {
            title: "HTML href attribute",
            type: "string",
        },
        appearance: {
            title: "Appearance",
            type: "string",
            enum: ["justified", "lightweight", "outline", "primary", "stealth"],
        },
        children: {
            ...childrenSchema,
            formPluginId: "@microsoft/fast-components-react-msft/button/children",
            examples: ["Lorem"],
            allowTypes: [ChildrenType.string],
        },
        beforeContent: {
            ...childrenSchema,
            title: "Before content",
            formPluginId: "@microsoft/fast-components-react-msft/button/beforeContent",
            pluginId: "@microsoft/fast-components-react-msft/button/beforeContent",
            allowTypes: [ChildrenType.component],
        },
        afterContent: {
            ...childrenSchema,
            title: "After content",
            formPluginId: "@microsoft/fast-components-react-msft/button/afterContent",
            pluginId: "@microsoft/fast-components-react-msft/button/afterContent",
            allowTypes: [ChildrenType.component],
        },
    },
    required: ["children"],
};
