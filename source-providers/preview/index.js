const { isString, isNumber, isBoolean, isArray, isNull, forEach } = _;
const { SourceProvider } = dashboard.sourceProviders;

class PreviewProvider extends SourceProvider {

	constructor(settings) {
		super();
		this.settings = settings;
		this.sources = {};
	}

	updateFromProvider(updateSource) {
		this.sources = new Proxy(this.settings.sources || {}, {
			get: (sources, key) => {
				return sources[key];
			},
			set: (sources, key, { value, type, name }) => {

				sources[key] = { value, type, name };

				updateSource(key, {
					value,
					type,
					name
				});

				return true;
			}
		});

		forEach(this.sources, ({ value, type, name }, key) => {
			updateSource(key, {
				value,
				type,
				name
			});
		});
	}

	updateFromDashboard(key, value) {
	
		const type = this.getType(value);

		if (isNull(type)) {
			return;
		}

		if (key in this.sources) {
			if (type === this.sources[key].type) {
				this.sources[key] = {
					...this.sources[key],
					value
				};
			}
		} else {
			this.sources[key] = {
				value,
				type,
				name: key
			}
		}
	}
}

dashboard.sourceProviders.addType('Preview', PreviewProvider);
