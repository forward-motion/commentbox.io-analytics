# commentbox.io-analytics

This is a simple method for gathering website analytics in a safe, secure, scalable way. The method is as follows:

1. Host a 1x1 pixel image on a bucket in Google Cloud Storage.
2. Set up the proper permissions, lifecycle rules, and access logs on the bucket.
3. Load the image on your website (with conditionals, like respecting Do Not Track)
4. Either set up a Cloud Function to trigger on each access log creation, or create a script to parse the access logs on a regular basis.

For the CommentBox.io website, we have opted to parse the access logs and save to a local database as needed.

## Respecting the user.

This method (and its particular implementation on the CommentBox.io website) takes care to respect our website visitors.

Firstly, we conditionally load the pixel the Do Not Track browser setting as follows:
```jsx harmony
class DoNotTrack extends React.Component {

    state = {
        enabled: true
    };

    componentDidMount() {

        let enabled = navigator.doNotTrack == "yes" || navigator.doNotTrack == "1" || navigator.msDoNotTrack == "1";

        this.setState({ enabled });
    }

    render() {

        if (this.state.enabled) {
            return null;
        }

        return (
            <img
                src={`${process.env.ANALYTICS_URL}?ref=${encodeURIComponent(document.referrer)}`}
                style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1 }}
            />
        );
    }
}
```

Secondly, our access logs are automatically purged every 30 days, via a lifecycle rule.

Thirdly, the data we save to our database is both minimal and free of PII, since we hash the user's IP with a secret key.

## Implementation.

Please see the `start.js` file for how we parse the access logs and save the data to our database.